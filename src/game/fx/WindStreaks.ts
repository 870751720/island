import * as THREE from 'three';
import type { WindParams } from '../systems/WeatherSystem';
import { MAX_SCALE } from './ParticleScale';

const COUNT = 40; // 竖屏基准风线数,实际数量随屏幕宽高比缩放
const MAX_COUNT = COUNT * MAX_SCALE; // 缓冲按缩放上限一次性分配
const SEGMENTS = 4;
const SPAN = 28; // 玩家周围回绕跨度(基准)

type Trail = {
  x: number;
  z: number;
  y: number;
  phase: number;
  length: number;
};

/** 批量绘制短弧风线,沿世界风向流动;固定缓冲,仅一次 drawcall。 */
export class WindStreaks {
  private positions = new Float32Array(MAX_COUNT * SEGMENTS * 6);
  private geometry = new THREE.BufferGeometry();
  private material = new THREE.LineBasicMaterial({
    color: '#eef4dc', transparent: true, opacity: 0,
    depthWrite: false,
  });
  readonly mesh = new THREE.LineSegments(this.geometry, this.material);
  private trails: Trail[] = [];
  private initialized = false;
  private scale = 1;
  private count = COUNT;
  private span = SPAN;

  constructor() {
    this.scatter();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3)
      .setUsage(THREE.DynamicDrawUsage));
    this.geometry.setDrawRange(0, this.count * SEGMENTS * 2);
    this.mesh.frustumCulled = false;
  }

  /** 屏幕变宽时加密风线并扩大回绕跨度,保持与竖屏一致的屏幕密度 */
  setViewportScale(scale: number): void {
    if (scale === this.scale) return;
    this.scale = scale;
    this.count = Math.round(COUNT * scale);
    this.span = SPAN * Math.sqrt(scale);
    // 重撒为玩家相对坐标,复用 initialized 机制在下一帧补中心偏移
    this.scatter();
    this.initialized = false;
    this.geometry.setDrawRange(0, this.count * SEGMENTS * 2);
  }

  update(delta: number, center: THREE.Vector3, wind: WindParams): void {
    this.material.opacity = 0.38 * wind.intensity;
    let offset = 0;
    for (let i = 0; i < this.count; i++) {
      const trail = this.trails[i];
      if (!this.initialized) { trail.x += center.x; trail.z += center.z; }
      trail.phase = (trail.phase + delta * 0.65) % 1;
      trail.x += wind.dirX * delta * (7 + wind.intensity * 7);
      trail.z += wind.dirZ * delta * (7 + wind.intensity * 7);
      // 双轴回绕保证步行、传送和重新起风后玩家附近始终有风线。
      trail.x = center.x + ((trail.x - center.x + this.span / 2) % this.span + this.span) % this.span - this.span / 2;
      trail.z = center.z + ((trail.z - center.z + this.span / 2) % this.span + this.span) % this.span - this.span / 2;
      const length = trail.length * Math.sin(trail.phase * Math.PI);
      for (let segment = 0; segment < SEGMENTS; segment++) {
        for (let end = 0; end < 2; end++) {
          const t = (segment + end) / SEGMENTS;
          this.positions[offset++] = trail.x + wind.dirX * t * length;
          this.positions[offset++] = trail.y + Math.sin(t * Math.PI) * length * 0.09;
          this.positions[offset++] = trail.z + wind.dirZ * t * length;
        }
      }
    }
    this.initialized = true;
    this.geometry.attributes.position.needsUpdate = true;
  }

  private scatter(): void {
    this.trails = Array.from({ length: MAX_COUNT }, () => ({
      x: (Math.random() - 0.5) * this.span,
      z: (Math.random() - 0.5) * this.span,
      y: 0.8 + Math.random() * 4,
      phase: Math.random(),
      length: 1.4 + Math.random() * 1.8,
    }));
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
