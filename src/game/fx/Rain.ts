import * as THREE from 'three';

const DROP_COUNT = 700;
const AREA = 44; // 覆盖玩家周围的方形区域边长
const TOP = 22;
const FALL_SPEED = 34;

/** 雨滴粒子:一组 Points 跟随玩家位置下落循环,透明度随雨量渐变 */
export class Rain {
  readonly points: THREE.Points;
  private positions: Float32Array;
  private material: THREE.PointsMaterial;

  constructor() {
    this.positions = new Float32Array(DROP_COUNT * 3);
    for (let i = 0; i < DROP_COUNT; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * AREA;
      this.positions[i * 3 + 1] = Math.random() * TOP;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * AREA;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.PointsMaterial({
      color: '#bcd2e8',
      size: 0.2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.visible = false;
    this.points.frustumCulled = false;
  }

  update(delta: number, center: THREE.Vector3, intensity: number): void {
    this.points.visible = intensity > 0.01;
    if (!this.points.visible) return;
    this.material.opacity = 0.85 * intensity;
    // 只水平跟随,雨滴世界高度独立维护,避免跟随导致的视觉拖拽
    this.points.position.set(center.x, 0, center.z);
    for (let i = 1; i < this.positions.length; i += 3) {
      let y = this.positions[i] - FALL_SPEED * delta;
      if (y < 0) y = TOP;
      this.positions[i] = y;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
