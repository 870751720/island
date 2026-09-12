import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';

const RATE = 22; // 竖屏基准每秒落地效果数(按雨量缩放),宽屏随密度缩放
const RANGE = 20; // 玩家周围生成半径(基准)

/**
 * 雨滴落地交互:随机抽样落点,落到水面泛涟漪,落到地面溅起小水花。
 * 只抽样部分雨滴,保证移动端性能。
 */
export class RainImpact {
  private timer = 0;
  private scale = 1;
  private rate = RATE;
  private range = RANGE;

  constructor(
    private terrain: IslandTerrain,
    private waterFx: { ripple: (x: number, y: number, z: number) => void },
    private particles: { burst: (position: THREE.Vector3, color: string, count?: number) => void }
  ) {}

  /** 屏幕变宽时与雨丝同比例提高抽样速率,并扩大落点覆盖范围 */
  setViewportScale(scale: number): void {
    if (scale === this.scale) return;
    this.scale = scale;
    this.rate = RATE * scale;
    this.range = RANGE * Math.sqrt(scale);
  }

  update(delta: number, center: THREE.Vector3, intensity: number): void {
    if (intensity <= 0.05) return;
    this.timer -= delta;
    if (this.timer > 0) return;
    this.timer = 1 / (this.rate * intensity);
    const x = center.x + (Math.random() * 2 - 1) * this.range;
    const z = center.z + (Math.random() * 2 - 1) * this.range;
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
