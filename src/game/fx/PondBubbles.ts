import * as THREE from 'three';
import type { IslandTerrain, WaterArea } from '../world/IslandTerrain';
import type { WaterFx } from './WaterFx';

/** 稀疏的水底气泡,抵达水面时泛起小波纹;不在冰下生成。 */
export class PondBubbles {
  private readonly geometry = new THREE.IcosahedronGeometry(0.035, 0);
  private readonly material = new THREE.MeshBasicMaterial({
    color: '#c5e4df', transparent: true, opacity: 0.3, depthWrite: false,
  });
  private readonly bubbles: { mesh: THREE.Mesh; pond: WaterArea; speed: number }[] = [];
  private readonly timers: number[];

  constructor(private scene: THREE.Scene, private terrain: IslandTerrain, private waterFx: WaterFx) {
    this.timers = terrain.waterAreas.map(() => 5 + Math.random() * 7);
  }

  update(delta: number): void {
    this.terrain.waterAreas.forEach((pond, i) => {
      this.timers[i] -= delta;
      if (this.timers[i] > 0) return;
      this.timers[i] = 7 + Math.random() * 7;
      if (this.bubbles.length >= 24) return;
      const angle = Math.random() * Math.PI * 2;
      const r = this.terrain.pondEdgeRadius(pond, angle) * Math.random() * 0.55;
      const x = pond.x + Math.cos(angle + pond.rot) * r;
      const z = pond.z + Math.sin(angle + pond.rot) * r;
      if (this.terrain.getWaterKind(x, z) !== 'pond') return;
      const ground = this.terrain.getHeight(x, z);
      if (pond.waterY - ground < 0.3) return;
      const mesh = new THREE.Mesh(this.geometry, this.material);
      mesh.position.set(x, Math.max(ground + 0.1, pond.waterY - 0.7), z);
      this.scene.add(mesh);
      this.bubbles.push({ mesh, pond, speed: 0.2 + Math.random() * 0.08 });
    });
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      const p = b.mesh.position;
      const liquid = this.terrain.getWaterKind(p.x, p.z) === 'pond';
      p.y += b.speed * delta;
      if (!liquid || p.y >= b.pond.waterY - 0.02) {
        if (liquid) this.waterFx.ripple(p.x, b.pond.waterY, p.z, 0.25);
        this.scene.remove(b.mesh);
        this.bubbles.splice(i, 1);
      }
    }
  }

  dispose(): void {
    for (const b of this.bubbles) this.scene.remove(b.mesh);
    this.bubbles.length = 0;
    this.geometry.dispose();
    this.material.dispose();
  }
}
