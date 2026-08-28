import * as THREE from 'three';

/** 圆环参数:内半径/外半径 */
export type RingSize = { inner: number; outer: number };

/** 可复用的弧形进度圆环(重建几何体表现进度,配合底环使用) */
export class ArcRing {
  readonly mesh: THREE.Mesh;
  private arc = -1;
  private size: RingSize;

  constructor(
    size: RingSize,
    color: string,
    opacity: number
  ) {
    this.size = size;
    this.mesh = new THREE.Mesh(
      new THREE.RingGeometry(size.inner, size.outer, 48, 1, -Math.PI / 2, 0.01),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      })
    );
    this.mesh.renderOrder = 999;
  }

  /** 设置进度 0-1,null 隐藏;进度变化幅度过小则跳过重建 */
  setArc(progress: number | null): void {
    if (progress === null) {
      this.mesh.visible = false;
      this.arc = -1;
      return;
    }
    this.mesh.visible = true;
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    if (Math.abs(p - this.arc) < 0.005) return;
    this.arc = p;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.RingGeometry(
      this.size.inner,
      this.size.outer,
      64,
      1,
      -Math.PI / 2,
      Math.max(p, 0.01) * Math.PI * 2
    );
  }
}

/** 半透明黑色底环 */
export function makeRingBackdrop(size: RingSize): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(size.inner, size.outer, 48),
    new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    })
  );
  mesh.renderOrder = 998;
  return mesh;
}
