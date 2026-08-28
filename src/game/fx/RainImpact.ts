import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';

const RATE = 22; // 每秒落地效果数(按雨量缩放)
const RANGE = 20; // 玩家周围生成半径

/**
 * 雨滴落地交互:随机抽样落点,落到水面泛涟漪,落到地面溅起小水花。
 * 只抽样部分雨滴,保证移动端性能。
 */
export class RainImpact {
  private timer = 0;

  constructor(
    private terrain: IslandTerrain,
    private waterFx: { ripple: (x: number, y: number, z: number) => void },
    private particles: { burst: (position: THREE.Vector3, color: string, count?: number) => void }
  ) {}

  update(delta: number, center: THREE.Vector3, intensity: number): void {
    if (intensity <= 0.05) return;
    this.timer -= delta;
    if (this.timer > 0) return;
    this.timer = 1 / (RATE * intensity);
    const x = center.x + (Math.random() * 2 - 1) * RANGE;
    const z = center.z + (Math.random() * 2 - 1) * RANGE;
    const ground = this.terrain.getHeight(x, z);
    const water = this.terrain.getWaterLevel(x, z);
    if (ground < water) {
      // 落进海面或水洼:泛涟漪
      this.waterFx.ripple(x, water, z);
    } else {
      this.particles.burst(new THREE.Vector3(x, ground + 0.05, z), '#cfe4f0', 3);
    }
  }
}
