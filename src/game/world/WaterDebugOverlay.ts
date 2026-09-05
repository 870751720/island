import * as THREE from 'three';
import type { IslandTerrain } from './IslandTerrain';

/** GM 水体判定覆盖层：洋红=海水，亮绿=水洼。 */
export class WaterDebugOverlay {
  readonly mesh: THREE.Mesh;

  constructor(terrain: IslandTerrain) {
    const step = 1;
    const halfX = terrain.halfWidth;
    const halfZ = terrain.halfLength;
    const positions: number[] = [];
    const colors: number[] = [];
    const sea = new THREE.Color('#ff2bd6');
    const pond = new THREE.Color('#65ff4d');
    for (let z = -halfZ; z < halfZ; z += step) {
      for (let x = -halfX; x < halfX; x += step) {
        const cx = x + step / 2;
        const cz = z + step / 2;
        const kind = terrain.getWaterKind(cx, cz);
        if (!kind) continue;
        const y = terrain.getWaterLevel(cx, cz) + 0.06;
        positions.push(x, y, z, x, y, z + step, x + step, y, z, x, y, z + step, x + step, y, z + step, x + step, y, z);
        const color = kind === 'sea' ? sea : pond;
        for (let i = 0; i < 6; i++) colors.push(color.r, color.g, color.b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false,
    }));
    this.mesh.renderOrder = 20;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
