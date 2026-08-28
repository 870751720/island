import * as THREE from 'three';

const DROP_COUNT = 550;
const AREA = 44; // 覆盖玩家周围的方形区域边长
const TOP = 22;
const FALL_SPEED = 14;
const LENGTH_MIN = 0.3; // 雨丝长度范围,长短不一更自然
const LENGTH_MAX = 0.6;

/** 雨丝:一组竖直短线段跟随玩家位置下落循环,透明度随雨量渐变 */
export class Rain {
  readonly lines: THREE.LineSegments;
  private positions: Float32Array;
  private lengths: Float32Array;
  private material: THREE.LineBasicMaterial;

  constructor() {
    this.positions = new Float32Array(DROP_COUNT * 6);
    this.lengths = new Float32Array(DROP_COUNT);
    for (let i = 0; i < DROP_COUNT; i++) {
      const x = (Math.random() - 0.5) * AREA;
      const y = Math.random() * TOP;
      const z = (Math.random() - 0.5) * AREA;
      this.lengths[i] = LENGTH_MIN + Math.random() * (LENGTH_MAX - LENGTH_MIN);
      this.positions.set([x, y, z, x, y + this.lengths[i], z], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.LineBasicMaterial({
      color: '#bcd2e8',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.lines = new THREE.LineSegments(geo, this.material);
    this.lines.visible = false;
    this.lines.frustumCulled = false;
  }

  update(delta: number, center: THREE.Vector3, intensity: number): void {
    this.lines.visible = intensity > 0.01;
    if (!this.lines.visible) return;
    this.material.opacity = 0.55 * intensity;
    // 只水平跟随,雨丝世界高度独立维护,避免跟随导致的视觉拖拽
    this.lines.position.set(center.x, 0, center.z);
    const drop = FALL_SPEED * delta;
    for (let i = 0; i < DROP_COUNT; i++) {
      const bottom = i * 6 + 1;
      const top = i * 6 + 4;
      let y = this.positions[bottom] - drop;
      if (y < 0) y = TOP;
      this.positions[bottom] = y;
      this.positions[top] = y + this.lengths[i];
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    this.lines.geometry.dispose();
    this.material.dispose();
  }
}
