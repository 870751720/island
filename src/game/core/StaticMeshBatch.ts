import { modelVisualParts } from './ModelVisualParts';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type Chunk = { entries: Map<THREE.Object3D, THREE.BufferGeometry>; mesh: THREE.Mesh | null; dirty: boolean };

/** 每个空间块合并一份静态模型；只在铺设/回收后重建，不按路格增加 drawcall。 */
export class StaticMeshBatch {
  private chunks = new Map<string, Chunk>();
  private owners = new Map<THREE.Object3D, Chunk>();
  constructor(private scene: THREE.Scene, private material: THREE.Material) {}

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
    modelVisualParts.set(root, [{ geometry, matrix: new THREE.Matrix4(), worldSpace: true }]);
  }
  delete(root: THREE.Object3D): void {
    const chunk = this.owners.get(root);
    if (!chunk) return;
    chunk.entries.get(root)?.dispose();
    chunk.entries.delete(root);
    chunk.dirty = true;
    this.owners.delete(root);
    modelVisualParts.delete(root);
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
    for (const root of this.owners.keys()) modelVisualParts.delete(root);
    this.chunks.clear(); this.owners.clear(); this.material.dispose();
  }
}
