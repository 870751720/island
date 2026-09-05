import * as THREE from 'three';
import type { IslandTerrain } from './IslandTerrain';
import type { PropKind } from './Props';
import type { TreeSpecies } from './TreeSpecies';

/**
 * 长条岛的资源撒点算法:固定数量均匀撒点在 5 倍面积的岛上不再适用,
 * 改为「密度 × 实际陆地面积」定总量、按纬度分带调节密度与树种、
 * 低频噪声聚簇让植被成片出现(林子与空地交替)。
 * 纬度 t 以岛南端(出生侧)为 0、北端为 1。
 */

export type PropSpot = { kind: PropKind; x: number; z: number; species?: TreeSpecies };

type SpawnRule = {
  kind: PropKind;
  /** 每平方米陆地的目标密度(按旧圆形岛的手感标定) */
  density: number;
  /** 只在纬度 from 及以北出现(0 = 全岛) */
  from: number;
  /** 密度随纬度的缩放(南多还是北多) */
  mul?: (t: number) => number;
  /** 参与噪声聚簇(成片出现) */
  clustered: boolean;
};

/** 与旧岛固定数量(tree60/rock18/gravel32/berry20/shrub30/grass26/worm12)手感一致的基础密度,整体上浮 0.3 倍 */
const RULES: SpawnRule[] = [
  { kind: 'tree', density: 0.0060, from: 0, clustered: true },
  { kind: 'rock', density: 0.0018, from: 0, mul: (t) => 0.6 + 1.4 * t, clustered: false },
  { kind: 'gravel', density: 0.0033, from: 0, mul: (t) => 0.6 + 1.2 * t, clustered: false },
  { kind: 'berry', density: 0.0020, from: 0, mul: (t) => 1.4 - 0.7 * t, clustered: true },
  { kind: 'shrub', density: 0.0030, from: 0, clustered: true },
  { kind: 'grass', density: 0.0026, from: 0, mul: (t) => 1.25 - 0.5 * t, clustered: false },
  { kind: 'worm', density: 0.0012, from: 0, clustered: false },
];

/** 生成自己的 2D 值噪声(与地形噪声实现一致,种子独立) */
function createNoise(seed: number) {
  const hash = (x: number, y: number) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = smooth(x - xi);
    const yf = smooth(y - yi);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

/** 支持递减方向的 smoothstep */
function smoothstep(a: number, b: number, t: number): number {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

/** 按纬度挑树种:南端果树多,北端松树多,橡树全岛打底 */
function treeSpeciesAt(t: number, rng: () => number): TreeSpecies {
  const weights: Record<TreeSpecies, number> = {
    fruit: 0.15 + smoothstep(0.55, 0.15, t) * 0.65,
    pine: 0.15 + smoothstep(0.3, 0.75, t) * 0.75,
    oak: 0.55,
  };
  let roll = rng() * (weights.oak + weights.pine + weights.fruit);
  for (const species of Object.keys(weights) as TreeSpecies[]) {
    roll -= weights[species];
    if (roll <= 0) return species;
  }
  return 'oak';
}

/** 采样估算法线以上的陆地面积(定总量的基准) */
function estimateLandArea(terrain: IslandTerrain): number {
  const step = 8;
  let land = 0;
  for (let x = -terrain.halfWidth; x <= terrain.halfWidth; x += step) {
    for (let z = -terrain.halfLength; z <= terrain.halfLength; z += step) {
      if (terrain.getHeight(x, z) > 0.3) land++;
    }
  }
  return land * step * step;
}

/** 生成全岛自然资源落点(模型创建仍由 Props 负责) */
export function generatePropSpots(
  terrain: IslandTerrain,
  rng: () => number = Math.random
): PropSpot[] {
  const noise = createNoise(rng() * 1000);
  const landArea = estimateLandArea(terrain);
  const spots: PropSpot[] = [];
  const maxX = terrain.halfWidth * 0.92;
  const pos = new THREE.Vector3();
  for (const rule of RULES) {
    const count = Math.round(rule.density * landArea);
    let placed = 0;
    for (let tries = 0; tries < count * 12 && placed < count; tries++) {
      const t = rule.from + rng() * (1 - rule.from);
      const x = (rng() * 2 - 1) * maxX;
      const z = terrain.halfLength - t * terrain.length;
      const y = terrain.getHeight(x, z);
      if (y <= 0.3) continue;
      pos.set(x, y, z);
      if (terrain.isNearWater(pos, 1)) continue;
      if (rule.mul && rng() > rule.mul(t)) continue;
      if (rule.clustered) {
        // 噪声掩码 + 抖动:高于阈值处成片,低于阈值处留出空地
        const mask = noise(x * 0.016 + 31, z * 0.016 + 77);
        if (mask + (rng() - 0.5) * 0.4 < 0.45) continue;
      }
      const spot: PropSpot = { kind: rule.kind, x, z };
      if (rule.kind === 'tree') spot.species = treeSpeciesAt(t, rng);
      spots.push(spot);
      placed++;
    }
  }
  return spots;
}
