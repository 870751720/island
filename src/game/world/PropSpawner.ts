import * as THREE from 'three';
import type { IslandTerrain } from './IslandTerrain';
import type { PropKind } from './Props';
import type { TreeSpecies } from './TreeSpecies';
import { isPassage, landCells, latitude, SpawnSpacing, type GroundPoint } from './SpawnLayout';

export type PropSpot = { kind: PropKind; x: number; z: number; species?: TreeSpecies };
type Rule = { kind: PropKind; density: number; radius: number; patch: number; weights: number[]; minT?: number };
const RULES: Rule[] = [
  { kind: 'tree', density: 60, radius: 1.8, patch: 12, weights: [0.9, 1.1, 1, 1.2] },
  { kind: 'rock', density: 18, radius: 1.2, patch: 6, weights: [0.5, 0.7, 1.4, 2] },
  { kind: 'iron', density: 40, radius: 1.2, patch: 4, weights: [0.4, 0.6, 1, 1.3], minT: 0.5 },
  { kind: 'gravel', density: 23, radius: 0.7, patch: 1, weights: [1, 0.8, 1.2, 1.5] },
  { kind: 'berry', density: 12, radius: 0.8, patch: 4, weights: [1.8, 1.3, 0.7, 0.4] },
  { kind: 'shrub', density: 21, radius: 0.8, patch: 5, weights: [1.3, 1.2, 0.9, 0.7] },
  { kind: 'grass', density: 25, radius: 0.65, patch: 7, weights: [1.4, 1.3, 0.8, 0.6] },
  { kind: 'worm', density: 7, radius: 0.65, patch: 3, weights: [1.2, 1.2, 1, 0.7] },
];
/** 支持递减方向的 smoothstep */
function smoothstep(a: number, b: number, t: number): number {
  const x = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

function weight(rule: Rule, t: number): number {
  const stops = [0.1, 0.325, 0.6, 0.875];
  for (let i = 0; i < 3; i++) if (t < stops[i + 1]) {
    const f = THREE.MathUtils.clamp((t - stops[i]) / (stops[i + 1] - stops[i]), 0, 1);
    return THREE.MathUtils.lerp(rule.weights[i], rule.weights[i + 1], f);
  }
  return rule.weights[3];
}

/** Host-only initial layout; saved games restore their full resource list. */
export function generatePropSpots(terrain: IslandTerrain, rng: () => number = Math.random): PropSpot[] {
  const cells = landCells(terrain);
  if (!cells.length) return [];
  const spawn = terrain.findSpawnPoint(), spacing = new SpawnSpacing();
  const spots: PropSpot[] = [], p = new THREE.Vector3();
  const counts = new Map<PropKind, number>();
  const camp = cells.filter(c => Math.hypot(c.x - spawn.x, c.z - spawn.z) < 30)
    .sort((a, b) => Math.hypot(a.x - spawn.x, a.z - spawn.z + 18) - Math.hypot(b.x - spawn.x, b.z - spawn.z + 18))[0] ?? spawn;
  const place = (rule: Rule, x: number, z: number): boolean => {
    p.set(x, terrain.getHeight(x, z), z);
    if (p.y <= 0.3 || terrain.isNearWater(p, 1)) return false;
    // 有硬性纬度下限的资源(铁矿)不出现在下限以北
    if (rule.minT !== undefined && latitude(terrain, z) < rule.minT) return false;
    if (Math.abs(x - camp.x) < 6 && Math.abs(z - camp.z) < 6) return false;
    if (rule.radius > 1 && isPassage(x, z)) return false;
    if (!spacing.accepts(x, z, rule.radius)) return false;
    const spot: PropSpot = { kind: rule.kind, x, z };
    if (rule.kind === 'tree') {
      const t = latitude(terrain, z);
      const weights: Record<TreeSpecies, number> = {
        fruit: 0.15 + smoothstep(0.55, 0.15, t) * 0.65,
        pine: 0.15 + smoothstep(0.3, 0.75, t) * 0.75,
        oak: 0.55,
      };
      let roll = rng() * (weights.oak + weights.pine + weights.fruit);
      spot.species = (Object.keys(weights) as TreeSpecies[]).find((s) => (roll -= weights[s]) <= 0) ?? 'oak';
    }
    spots.push(spot);
    spacing.add(x, z, rule.radius);
    counts.set(rule.kind, (counts.get(rule.kind) ?? 0) + 1);
    return true;
  };
  // Starter supplies count towards each resource's budget, with bounded shoreline fallback.
  const starter = [...cells].sort((a, b) => Math.hypot(a.x - spawn.x, a.z - spawn.z) - Math.hypot(b.x - spawn.x, b.z - spawn.z));
  for (const [kind, count, range] of [
    ['shrub', 3, 15], ['gravel', 3, 15], ['berry', 3, 15], ['grass', 3, 15], ['tree', 8, 35], ['rock', 3, 35],
  ] as [PropKind, number, number][]) {
    const rule = RULES.find(r => r.kind === kind)!;
    for (const limit of [range, range + 10, range + 20]) {
      for (const c of starter) {
        if ((counts.get(kind) ?? 0) >= count || Math.hypot(c.x - spawn.x, c.z - spawn.z) > limit) break;
        place(rule, c.x, c.z);
      }
      if ((counts.get(kind) ?? 0) >= count) break;
    }
  }
  for (const rule of RULES) {
    const usable = cells.filter(c => !(rule.radius > 1 && isPassage(c.x, c.z)) && !(Math.abs(c.x - camp.x) < 6 && Math.abs(c.z - camp.z) < 6) && !(rule.minT !== undefined && latitude(terrain, c.z) < rule.minT));
    const target = Math.max(counts.get(rule.kind) ?? 0, Math.round(usable.length * 16 * rule.density / 10000));
    const maxWeight = Math.max(...rule.weights), anchors: GroundPoint[] = [];
    const anchorCount = Math.ceil(target * 0.7 / rule.patch);
    for (let tries = 0; tries < anchorCount * 100 && anchors.length < anchorCount; tries++) {
      const c = usable[Math.floor(rng() * usable.length)];
      if (!c || rng() * maxWeight > weight(rule, latitude(terrain, c.z))) continue;
      if (rule.kind === 'worm' && !terrain.waterAreas.some(w => Math.hypot(c.x - w.x, c.z - w.z) < w.radius + 14)) continue;
      if (anchors.some(a => Math.hypot(a.x - c.x, a.z - c.z) < 18)) continue;
      anchors.push(c);
    }
    const patchCounts = anchors.map(() => 0);
    for (let tries = 0; tries < target * 100 && (counts.get(rule.kind) ?? 0) < target; tries++) {
      const clustered = rule.patch > 1 && anchors.length > 0 && rng() < 0.7;
      const index = Math.floor(rng() * anchors.length);
      if (clustered && patchCounts[index] >= rule.patch) continue;
      const c = clustered ? anchors[index] : usable[Math.floor(rng() * usable.length)];
      if (!c) break;
      const angle = rng() * Math.PI * 2;
      const radius = clustered ? Math.sqrt(rng()) * (rule.kind === 'tree' ? 13 : 6) : 2;
      const x = c.x + Math.cos(angle) * radius, z = c.z + Math.sin(angle) * radius;
      if (!clustered && rng() * maxWeight > weight(rule, latitude(terrain, z))) continue;
      if (rule.kind === 'worm' && !terrain.waterAreas.some(w => Math.hypot(x - w.x, z - w.z) < w.radius + 18)) continue;
      if (place(rule, x, z) && clustered) patchCounts[index]++;
    }
  }
  return spots;
}
