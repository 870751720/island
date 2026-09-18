import * as THREE from 'three';
import type { IslandTerrain } from './IslandTerrain';

const RADIUS = 2.4;

/** 所有火把共用一张径向纹理和一个地形贴面批次，无逐灯 draw call。 */
export class FlameGroundGlow {
  private readonly patches = new Map<object, { positions: number[]; uvs: number[] }>();
  private readonly texture: THREE.DataTexture;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private dirty = false;

  constructor(scene: THREE.Scene, private readonly terrain: IslandTerrain) {
    const size = 32;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
      const at = (y * size + x) * 4;
      data[at] = data[at + 1] = data[at + 2] = 255;
      data[at + 3] = Math.round(Math.max(0, 1 - radius) ** 2 * 255);
    }
    this.texture = new THREE.DataTexture(data, size, size);
    this.texture.magFilter = this.texture.minFilter = THREE.LinearFilter;
    this.texture.needsUpdate = true;
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture, color: '#ff9d2e', opacity: 0.3, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  add(key: object, origin: THREE.Vector3): void {
    // 复制覆盖区域内的原地形三角面，坡面不穿地，也不使用悬空的大平面。
    const geometry = this.terrain.mesh.geometry as THREE.PlaneGeometry;
    const { width, height, widthSegments: cols, heightSegments: rows } = geometry.parameters;
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex()!;
    const firstX = Math.max(0, Math.floor((origin.x - RADIUS + width / 2) / width * cols));
    const lastX = Math.min(cols - 1, Math.floor((origin.x + RADIUS + width / 2) / width * cols));
    const firstZ = Math.max(0, Math.floor((origin.z - RADIUS + height / 2) / height * rows));
    const lastZ = Math.min(rows - 1, Math.floor((origin.z + RADIUS + height / 2) / height * rows));
    const positions: number[] = [], uvs: number[] = [];
    for (let z = firstZ; z <= lastZ; z++) for (let x = firstX; x <= lastX; x++) {
      for (let i = 0; i < 6; i++) {
        const id = index.getX((z * cols + x) * 6 + i);
        const px = position.getX(id), pz = position.getZ(id);
        positions.push(px, position.getY(id) + 0.018, pz);
        uvs.push((px - origin.x) / (RADIUS * 2) + 0.5, (pz - origin.z) / (RADIUS * 2) + 0.5);
      }
    }
    this.patches.set(key, { positions, uvs });
    this.dirty = true;
  }

  remove(key: object): void {
    if (this.patches.delete(key)) this.dirty = true;
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    const positions: number[] = [], uvs: number[] = [];
    for (const patch of this.patches.values()) {
      positions.push(...patch.positions);
      uvs.push(...patch.uvs);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (positions.length) geometry.computeBoundingSphere();
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.mesh.visible = positions.length > 0;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.patches.clear();
  }
}
