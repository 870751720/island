import * as THREE from 'three';
import { MAX_SCALE } from './ParticleScale';

const DROP_COUNT = 550; // 竖屏基准雨丝数,实际数量随屏幕宽高比缩放
const MAX_DROPS = DROP_COUNT * MAX_SCALE; // 缓冲按缩放上限一次性分配
const AREA = 44; // 覆盖玩家周围的方形区域边长(基准)
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
  private scale = 1;
  private count = DROP_COUNT;
  private area = AREA;

  constructor() {
    this.positions = new Float32Array(MAX_DROPS * 6);
    this.lengths = new Float32Array(MAX_DROPS);
    this.scatter();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.LineBasicMaterial({
      color: '#bcd2e8',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.lines = new THREE.LineSegments(geo, this.material);
    this.lines.geometry.setDrawRange(0, this.count * 2);
    this.lines.visible = false;
    this.lines.frustumCulled = false;
  }

  /** 屏幕变宽时加密雨丝并扩大覆盖区域,保持与竖屏一致的屏幕密度 */
  setViewportScale(scale: number): void {
    if (scale === this.scale) return;
    this.scale = scale;
    this.count = Math.round(DROP_COUNT * scale);
    this.area = AREA * Math.sqrt(scale);
    // 雨丝水平位置固定,不会自行扩散到扩大的外圈,需要整体重撒
    this.scatter();
    this.lines.geometry.setDrawRange(0, this.count * 2);
  }

  update(delta: number, center: THREE.Vector3, intensity: number): void {
    this.lines.visible = intensity > 0.01;
    if (!this.lines.visible) return;
    this.material.opacity = 0.55 * intensity;
    // 只水平跟随,雨丝世界高度独立维护,避免跟随导致的视觉拖拽
    this.lines.position.set(center.x, 0, center.z);
    const drop = FALL_SPEED * delta;
    for (let i = 0; i < this.count; i++) {
      const bottom = i * 6 + 1;
      const top = i * 6 + 4;
      let y = this.positions[bottom] - drop;
      if (y < 0) y = TOP;
      this.positions[bottom] = y;
      this.positions[top] = y + this.lengths[i];
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
  }

  private scatter(): void {
    for (let i = 0; i < MAX_DROPS; i++) {
      const x = (Math.random() - 0.5) * this.area;
      const y = Math.random() * TOP;
      const z = (Math.random() - 0.5) * this.area;
      this.lengths[i] = LENGTH_MIN + Math.random() * (LENGTH_MAX - LENGTH_MIN);
      this.positions.set([x, y, z, x, y + this.lengths[i], z], i * 6);
    }
  }

  dispose(): void {
    this.lines.geometry.dispose();
    this.material.dispose();
  }
}
