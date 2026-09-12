import * as THREE from 'three';
import type { WindParams } from '../systems/WeatherSystem';

const COUNT = 40;
const SEGMENTS = 4;
const SPAN = 28;

/** 批量绘制短弧风线,沿世界风向流动;固定缓冲,仅一次 drawcall。 */
export class WindStreaks {
  private positions = new Float32Array(COUNT * SEGMENTS * 6);
  private geometry = new THREE.BufferGeometry();
  private material = new THREE.LineBasicMaterial({
    color: '#eef4dc', transparent: true, opacity: 0,
    depthWrite: false,
  });
  readonly mesh = new THREE.LineSegments(this.geometry, this.material);
  private trails = Array.from({ length: COUNT }, () => ({
    x: (Math.random() - 0.5) * SPAN,
    z: (Math.random() - 0.5) * SPAN,
    y: 0.8 + Math.random() * 4,
    phase: Math.random(),
    length: 1.4 + Math.random() * 1.8,
  }));
  private initialized = false;

  constructor() {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3)
      .setUsage(THREE.DynamicDrawUsage));
    this.mesh.frustumCulled = false;
  }

  update(delta: number, center: THREE.Vector3, wind: WindParams): void {
    this.material.opacity = 0.38 * wind.intensity;
    let offset = 0;
    for (const trail of this.trails) {
      if (!this.initialized) { trail.x += center.x; trail.z += center.z; }
      trail.phase = (trail.phase + delta * 0.65) % 1;
      trail.x += wind.dirX * delta * (7 + wind.intensity * 7);
      trail.z += wind.dirZ * delta * (7 + wind.intensity * 7);
      // 双轴回绕保证步行、传送和重新起风后玩家附近始终有风线。
      trail.x = center.x + ((trail.x - center.x + SPAN / 2) % SPAN + SPAN) % SPAN - SPAN / 2;
      trail.z = center.z + ((trail.z - center.z + SPAN / 2) % SPAN + SPAN) % SPAN - SPAN / 2;
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

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
