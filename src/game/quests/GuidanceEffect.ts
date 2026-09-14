import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';

/** 任务与求生共用的轻量引导效果。 */
export class GuidanceEffect {
  private group = new THREE.Group();
  private ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.88, 32), new THREE.MeshBasicMaterial({ color: '#d9eab6', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
  private line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#e8d8a2', transparent: true, opacity: 0.8, dashSize: 0.5, gapSize: 0.35, depthWrite: false }));
  private dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 6, 4), new THREE.MeshBasicMaterial({ color: '#fff4c9', transparent: true, opacity: 0.95, depthWrite: false, depthTest: false }), 24);
  private distances: number[] = [];
  private ringVertices = new Float32Array(this.ring.geometry.getAttribute('position').array);
  private matrix = new THREE.Matrix4();
  private points: THREE.Vector3[] = [];
  private target: { x: number; z: number } | null = null;
  private elapsed = 0;
  private reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(private scene: THREE.Scene, private terrain: IslandTerrain) {
    this.ring.renderOrder = 10;
    this.dots.renderOrder = 11;
    this.ring.frustumCulled = false;
    this.line.frustumCulled = false;
    this.dots.frustumCulled = false;
    this.group.add(this.ring, this.line, this.dots);
    this.group.visible = false;
    scene.add(this.group);
  }
  setPath(path: { x: number; z: number }[] | null): void {
    this.target = path?.[path.length - 1] ?? null;
    this.points = path?.map(p => new THREE.Vector3(p.x, this.terrain.getHeight(p.x, p.z) + 0.16, p.z)) ?? [];
    this.group.visible = this.points.length > 0;
    if (this.points.length) {
      this.updateRing();
      this.line.geometry.dispose();
      this.line.geometry = new THREE.BufferGeometry().setFromPoints(this.points);
      this.line.computeLineDistances();
    }
  }
  hide(): void { this.group.visible = false; }
  update(delta: number, origin: THREE.Vector3, showLine: boolean): void {
    this.elapsed += delta;
    if (!this.group.visible) return;
    if (this.target && this.points.length > 1) {
      this.points[0].set(origin.x, origin.y + 0.16, origin.z);
      const end = this.points[this.points.length - 1];
      end.set(this.target.x, this.terrain.getHeight(this.target.x, this.target.z) + 0.16, this.target.z);
      const positions = this.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      positions.setXYZ(0, this.points[0].x, this.points[0].y, this.points[0].z);
      positions.setXYZ(this.points.length - 1, end.x, end.y, end.z);
      positions.needsUpdate = true;
      this.line.computeLineDistances();
    }
    this.ring.material.opacity = this.reduced ? 0.9 : 0.82 + Math.sin(this.elapsed * 2) * 0.12;
    this.line.visible = showLine;
    this.dots.visible = showLine && this.points.length > 1;
    if (this.dots.visible && this.points.length > 1) {
      this.distances.length = this.points.length;
      this.distances[0] = 0;
      for (let i = 1; i < this.points.length; i++) {
        this.distances[i] = this.distances[i - 1] + this.points[i].distanceTo(this.points[i - 1]);
      }
      const length = this.distances[this.distances.length - 1];
      const count = Math.min(24, Math.max(1, Math.ceil(length / 1.8)));
      this.dots.count = length > 0 ? count : 0;
      for (let i = 0; i < this.dots.count; i++) {
        // 按实际距离匀速流向目标；减少动态效果时保留缓慢方向提示。
        const distance = (i * length / count + this.elapsed * (this.reduced ? 0.45 : 1.8)) % length;
        let index = 0;
        while (index < this.points.length - 2 && this.distances[index + 1] <= distance) index++;
        const a = this.points[index], b = this.points[index + 1];
        const span = this.distances[index + 1] - this.distances[index];
        const t = span > 0 ? (distance - this.distances[index]) / span : 0;
        this.matrix.makeTranslation(THREE.MathUtils.lerp(a.x, b.x, t), THREE.MathUtils.lerp(a.y, b.y, t) + 0.12, THREE.MathUtils.lerp(a.z, b.z, t));
        this.dots.setMatrixAt(i, this.matrix);
      }
      this.dots.instanceMatrix.needsUpdate = true;
    }
  }
  private updateRing(): void {
    if (!this.target) return;
    const positions = this.ring.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const x = this.target.x + this.ringVertices[i * 3];
      const z = this.target.z - this.ringVertices[i * 3 + 1];
      positions.setXYZ(i, x, this.terrain.getHeight(x, z) + 0.2, z);
    }
    positions.needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.group);
    for (const object of [this.ring, this.line, this.dots]) { object.geometry.dispose(); object.material.dispose(); }
    this.dots.dispose();
  }
}
