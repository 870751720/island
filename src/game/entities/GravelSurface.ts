import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { patchSeasonMaterial } from '../world/SeasonVisuals';

export type RoadNeighbors = (dx: number, dz: number) => boolean;

/** 连通处不收边；外沿按世界坐标柔和起伏，地表颜色逐渐透出。 */
export function gravelCoverage(x: number, z: number, cx: number, cz: number, neighbor: RoadNeighbors): number {
  const px = x - cx, pz = z - cz;
  let distance = 1;
  if (!neighbor(-1, 0)) distance = Math.min(distance, px + 0.5);
  if (!neighbor(1, 0)) distance = Math.min(distance, 0.5 - px);
  if (!neighbor(0, -1)) distance = Math.min(distance, pz + 0.5);
  if (!neighbor(0, 1)) distance = Math.min(distance, 0.5 - pz);
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    if (!neighbor(dx, dz)) distance = Math.min(distance, Math.hypot(px - dx * 0.5, pz - dz * 0.5));
  }
  const waviness = Math.sin(x * 19 + Math.sin(z * 13)) * 0.025 + Math.sin(z * 27 + x * 11) * 0.02;
  return THREE.MathUtils.smoothstep(distance, Math.max(0.02, 0.035 + waviness), 0.20 + waviness);
}

export function gravelSurfaceMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  patchSeasonMaterial(material, 'terrain');
  return material;
}

type Chunk = { entries: Map<THREE.Object3D, THREE.BufferGeometry>; mesh: THREE.Mesh | null; dirty: boolean };

/** 每个空间块合并一份贴地路底；只在铺设/回收后重建，不按路格增加 drawcall。 */
export class GravelSurfaceBatch {
  private chunks = new Map<string, Chunk>();
  private owners = new Map<THREE.Object3D, Chunk>();
  private material = gravelSurfaceMaterial();
  constructor(private scene: THREE.Scene) {}

  set(root: THREE.Object3D, geometry: THREE.BufferGeometry): void {
    this.delete(root);
    const p = root.position;
    const key = `${Math.floor(p.x / 16)},${Math.floor(p.z / 16)}`;
    let chunk = this.chunks.get(key);
    if (!chunk) { chunk = { entries: new Map(), mesh: null, dirty: true }; this.chunks.set(key, chunk); }
    geometry.translate(p.x, p.y, p.z);
    chunk.entries.set(root, geometry);
    chunk.dirty = true;
    this.owners.set(root, chunk);
  }
  delete(root: THREE.Object3D): void {
    const chunk = this.owners.get(root);
    if (!chunk) return;
    chunk.entries.get(root)?.dispose();
    chunk.entries.delete(root);
    chunk.dirty = true;
    this.owners.delete(root);
  }
  flush(): void {
    for (const [key, chunk] of this.chunks) {
      if (!chunk.dirty) continue;
      if (chunk.mesh) { this.scene.remove(chunk.mesh); chunk.mesh.geometry.dispose(); chunk.mesh = null; }
      if (!chunk.entries.size) { this.chunks.delete(key); continue; }
      const geometry = mergeGeometries([...chunk.entries.values()]);
      if (geometry) {
        chunk.mesh = new THREE.Mesh(geometry, this.material);
        chunk.mesh.receiveShadow = true;
        this.scene.add(chunk.mesh);
      }
      chunk.dirty = false;
    }
  }
  dispose(): void {
    for (const chunk of this.chunks.values()) {
      for (const geometry of chunk.entries.values()) geometry.dispose();
      if (chunk.mesh) { this.scene.remove(chunk.mesh); chunk.mesh.geometry.dispose(); }
    }
    this.chunks.clear(); this.owners.clear(); this.material.dispose();
  }
}
