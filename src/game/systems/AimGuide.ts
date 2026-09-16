import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';

/** 瞄准虚线:沿瞄准方向的一串贴地圆点,随蓄力进度逐渐向外延伸(弓与套索共用) */
export class AimGuide {
  readonly group = new THREE.Group();
  private marker = new THREE.Mesh(
    new THREE.RingGeometry(0.48, 0.56, 20),
    new THREE.MeshBasicMaterial({ color: '#ffe69a', depthWrite: false, side: THREE.DoubleSide })
  );
  private spreadPositions = new Float32Array(18);
  private spreadGeometry = new THREE.BufferGeometry();
  private spreadLines = new THREE.LineSegments(this.spreadGeometry,
    new THREE.LineBasicMaterial({ color: '#ffe69a', transparent: true, opacity: 0.55, depthWrite: false }));
  private dots: THREE.Mesh[] = [];

  constructor(
    private terrain: IslandTerrain,
    /** 虚线终点距离(即武器射程) */
    private range: number,
    /** 虚线点数 */
    dots: number,
    /** 第一个点距起点的距离 */
    private start = 1
  ) {
    const geo = new THREE.SphereGeometry(0.09, 6, 4);
    const mat = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.85 });
    for (let i = 0; i < dots; i++) {
      const dot = new THREE.Mesh(geo, mat);
      dot.visible = false;
      this.dots.push(dot);
      this.group.add(dot);
    }
    this.marker.rotation.x = -Math.PI / 2;
    this.spreadGeometry.setAttribute('position', new THREE.BufferAttribute(this.spreadPositions, 3));
    this.spreadLines.frustumCulled = false;
    this.group.add(this.marker, this.spreadLines);
    this.group.visible = false;
  }

  /** 显示:origin 为射手位置,progress∈(0,1] 为蓄力进度,决定点数 */
  show(origin: THREE.Vector3, dirX: number, dirZ: number, progress: number, target: THREE.Vector3, spread: number): void {
    this.group.visible = true;
    this.marker.position.set(target.x, this.terrain.getHeight(target.x, target.z) + 0.12, target.z);
    const angle = Math.atan2(dirZ, dirX);
    const distance = Math.min(this.range, Math.hypot(target.x - origin.x, target.z - origin.z));
    const points = [
      [origin.x, origin.z],
      [origin.x + Math.cos(angle - spread) * distance, origin.z + Math.sin(angle - spread) * distance],
      [origin.x, origin.z],
      [origin.x + Math.cos(angle + spread) * distance, origin.z + Math.sin(angle + spread) * distance],
    ];
    points.push(points[1], points[3]);
    for (let i = 0; i < points.length; i++) {
      const [x, z] = points[i];
      this.spreadPositions.set([x, this.terrain.getHeight(x, z) + 0.15, z], i * 3);
    }
    this.spreadGeometry.attributes.position.needsUpdate = true;
    const count = Math.max(1, Math.round(progress * this.dots.length));
    const step = (this.range - this.start) / (this.dots.length - 1);
    for (let i = 0; i < this.dots.length; i++) {
      const dot = this.dots[i];
      if (i >= count) {
        dot.visible = false;
        continue;
      }
      const d = this.start + step * i;
      const x = origin.x + dirX * d;
      const z = origin.z + dirZ * d;
      dot.visible = true;
      dot.position.set(x, this.terrain.getHeight(x, z) + 0.3, z);
      // 越靠前(越接近拉满)的点越亮越大
      const k = (i + 1) / this.dots.length;
      dot.scale.setScalar(0.7 + k * 0.6);
    }
  }

  hide(): void {
    this.group.visible = false;
  }
}
