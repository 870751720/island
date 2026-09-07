import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { IslandTerrain } from './IslandTerrain';

/** 确定性随机(mulberry32):装饰布局只由地形种子决定,房主/客人两端一致 */
function createRng(seed: number): () => number {
  let a = Math.floor(seed * 100000) + 0x6d2b79f5;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 生成高度带:花/蘑菇在草地,贝壳/海星在沙滩 */
type Band = 'grass' | 'beach';

type DecorationSpec = {
  name: string;
  geometry: THREE.BufferGeometry;
  band: Band;
  count: number;
  /** 聚簇半径;0 表示均匀散布 */
  clusterRadius: number;
};

const STEM_GREEN = '#6f9e4c';

/** 给几何体整体填一个顶点色,合并后同一实例网格用 vertexColors 一次画完 */
function tint(geometry: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3).fill(1).map((_, i) => (i % 3 === 0 ? c.r : i % 3 === 1 ? c.g : c.b)), 3));
  return geometry;
}

function makeFlowerGeometry(petal: string): THREE.BufferGeometry {
  const stem = new THREE.CylinderGeometry(0.02, 0.03, 0.26, 4);
  stem.translate(0, 0.13, 0);
  const blossom = new THREE.ConeGeometry(0.08, 0.14, 5);
  blossom.translate(0, 0.3, 0);
  return mergeGeometries([tint(stem, STEM_GREEN), tint(blossom, petal)])!;
}

function makeMushroomGeometry(cap: string): THREE.BufferGeometry {
  const stem = new THREE.CylinderGeometry(0.045, 0.065, 0.16, 5);
  stem.translate(0, 0.08, 0);
  const capCone = new THREE.ConeGeometry(0.13, 0.12, 6);
  capCone.translate(0, 0.2, 0);
  return mergeGeometries([tint(stem, '#e8dcc0'), tint(capCone, cap)])!;
}

function makeShellGeometry(): THREE.BufferGeometry {
  // 扇贝:五棱扁锥半埋进沙里,只露出背面
  const fan = new THREE.ConeGeometry(0.12, 0.2, 5);
  fan.rotateX(Math.PI / 2.4);
  fan.translate(0, 0.05, 0);
  return tint(fan, '#f2dfe2');
}

function makeStarfishGeometry(): THREE.BufferGeometry {
  const body = new THREE.ConeGeometry(0.16, 0.06, 5);
  body.rotateX(Math.PI / 2);
  body.translate(0, 0.03, 0);
  return tint(body, '#e08a4e');
}

const SPECS: DecorationSpec[] = [
  { name: 'flowerWhite', geometry: makeFlowerGeometry('#f4f1e0'), band: 'grass', count: 110, clusterRadius: 3 },
  { name: 'flowerYellow', geometry: makeFlowerGeometry('#e8c84f'), band: 'grass', count: 90, clusterRadius: 3 },
  { name: 'flowerPink', geometry: makeFlowerGeometry('#e08fa8'), band: 'grass', count: 70, clusterRadius: 3 },
  { name: 'mushroomBrown', geometry: makeMushroomGeometry('#a5714a'), band: 'grass', count: 60, clusterRadius: 4 },
  { name: 'mushroomRed', geometry: makeMushroomGeometry('#c04f3d'), band: 'grass', count: 30, clusterRadius: 4 },
  { name: 'shell', geometry: makeShellGeometry(), band: 'beach', count: 130, clusterRadius: 5 },
  { name: 'starfish', geometry: makeStarfishGeometry(), band: 'beach', count: 45, clusterRadius: 5 },
];

/**
 * 纯视觉装饰物(花/蘑菇/贝壳/海星):不占资源预算、不进存档、不同步,
 * 每端用共享的 terrainSeed 确定性生成,两端画面一致。
 * 每种装饰一个 InstancedMesh,整体只增加个位数 draw call。
 */
export class Decorations {
  private readonly meshes: THREE.InstancedMesh[] = [];
  private readonly material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 1,
  });

  constructor(private scene: THREE.Scene, terrain: IslandTerrain, seed: number) {
    const rng = createRng(seed);
    const p = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scaleV = new THREE.Vector3();
    // 高度带判定:沙滩为水线以上的低平地,草地更高且避开一切水域
    const inBand = (band: Band) => {
      const h = p.y;
      if (terrain.isNearWater(p, 0.4)) return false;
      return band === 'beach' ? h > 0.05 && h <= 0.7 : h > 0.7;
    };
    for (const spec of SPECS) {
      const mesh = new THREE.InstancedMesh(spec.geometry, this.material, spec.count);
      mesh.count = 0;
      let placed = 0;
      // 聚簇锚点:约每个簇 6 件,70% 落点围绕锚点成片
      const anchors: THREE.Vector2[] = [];
      const anchorCount = spec.clusterRadius > 0 ? Math.ceil(spec.count / 6) : 0;
      for (let tries = 0; tries < spec.count * 40 && placed < spec.count; tries++) {
        let x: number, z: number;
        if (anchorCount > 0 && rng() < 0.7) {
          if (anchors.length < anchorCount && (anchors.length === 0 || rng() < 0.2)) {
            p.set(rng() * terrain.width - terrain.halfWidth, 0, rng() * terrain.length - terrain.halfLength);
            p.y = terrain.getHeight(p.x, p.z);
            if (inBand(spec.band)) anchors.push(new THREE.Vector2(p.x, p.z));
            continue;
          }
          const a = anchors[Math.floor(rng() * anchors.length)];
          if (!a) continue;
          const angle = rng() * Math.PI * 2;
          const r = Math.sqrt(rng()) * spec.clusterRadius;
          x = a.x + Math.cos(angle) * r;
          z = a.y + Math.sin(angle) * r;
        } else {
          x = rng() * terrain.width - terrain.halfWidth;
          z = rng() * terrain.length - terrain.halfLength;
        }
        p.set(x, terrain.getHeight(x, z), z);
        if (!inBand(spec.band)) continue;
        quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI * 2);
        const s = 0.8 + rng() * 0.6;
        scaleV.set(s, s, s);
        matrix.compose(p.clone().setY(p.y + 0.01), quat, scaleV);
        mesh.setMatrixAt(placed++, matrix);
      }
      mesh.count = placed;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.meshes.push(mesh);
    }
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.meshes.length = 0;
    this.material.dispose();
  }
}
