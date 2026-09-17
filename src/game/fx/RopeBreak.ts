import * as THREE from 'three';
import type { LassoPoint } from '../entities/LassoRules';

const DURATION = 0.75;
const HALF_SEGMENTS = 5;

/** 两截断绳从断口回弹并落下；仅两个 draw call，结束即释放资源。 */
export class RopeBreak {
  private elapsed = 0;
  private halves: THREE.Line[] = [];
  private from: THREE.Vector3;
  private to: THREE.Vector3;

  constructor(private parent: THREE.Object3D, from: LassoPoint, to: LassoPoint) {
    this.from = new THREE.Vector3(from.x, from.y, from.z);
    this.to = new THREE.Vector3(to.x, to.y, to.z);
    for (let half = 0; half < 2; half++) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((HALF_SEGMENTS + 1) * 3), 3));
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#c9b588', transparent: true, depthWrite: false }));
      line.frustumCulled = false;
      this.halves.push(line);
      parent.add(line);
    }
    this.update(0);
  }

  /** 返回 true 表示演出结束。 */
  update(delta: number): boolean {
    this.elapsed += delta;
    if (this.elapsed >= DURATION) return true;
    const t = this.elapsed / DURATION;
    const recoil = 1 - Math.pow(1 - Math.min(1, t * 3), 3);
    const sag = Math.min(0.45, this.from.distanceTo(this.to) * 0.12);
    for (let half = 0; half < 2; half++) {
      const line = this.halves[half];
      const positions = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i <= HALF_SEGMENTS; i++) {
        const along = i / HALF_SEGMENTS;
        const reach = along * (0.48 - recoil * 0.17);
        const u = half === 0 ? reach : 1 - reach;
        positions.setXYZ(i,
          THREE.MathUtils.lerp(this.from.x, this.to.x, u),
          THREE.MathUtils.lerp(this.from.y, this.to.y, u) - sag * 4 * u * (1 - u)
            + Math.sin(t * Math.PI) * along * 0.22 - t * t * (0.3 + along * 0.8),
          THREE.MathUtils.lerp(this.from.z, this.to.z, u));
      }
      positions.needsUpdate = true;
      (line.material as THREE.LineBasicMaterial).opacity = Math.min(1, (1 - t) / 0.4);
    }
    return false;
  }

  dispose(): void {
    for (const line of this.halves) {
      this.parent.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.halves.length = 0;
  }
}
