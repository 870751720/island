import * as THREE from 'three';
import type { QuestRoute } from './QuestRoute';
import type { IslandTerrain } from '../world/IslandTerrain';

const DOT_SPACING = 2.2;
const DOT_SPEED = 0.65;

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
  private phase = 0;
  private directMode = false;
  private startIndex = 0;
  private sourcePath: { x: number; z: number }[] = [];
  private lastOrigin = new THREE.Vector3(Infinity, Infinity, Infinity);
  private reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(private scene: THREE.Scene, private terrain: IslandTerrain, private route: QuestRoute) {
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
    this.sourcePath = path?.map(p => ({ x: p.x, z: p.z })) ?? [];
    this.directMode = false;
    if (path?.length) this.lastOrigin.set(path[0].x, this.terrain.getHeight(path[0].x, path[0].z), path[0].z);
    else this.lastOrigin.set(Infinity, Infinity, Infinity);
    this.target = path?.[path.length - 1] ?? null;
    this.writePath(path);
  }
  private writePath(path: { x: number; z: number }[] | null): void {
    this.startIndex = 0;
    this.points = path?.map(p => new THREE.Vector3(p.x, this.terrain.getHeight(p.x, p.z) + 0.16, p.z)) ?? [];
    this.group.visible = this.points.length > 0;
    if (!this.points.length) return;
    this.updateRing();
    const geometry = this.line.geometry;
    let positions = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    let distances = geometry.getAttribute('lineDistance') as THREE.BufferAttribute | undefined;
    if (!positions || positions.count < this.points.length || !distances) {
      geometry.dispose();
      const capacity = Math.max(64, this.points.length * 2);
      positions = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
      distances = new THREE.BufferAttribute(new Float32Array(capacity), 1);
      geometry.setAttribute('position', positions);
      geometry.setAttribute('lineDistance', distances);
    }
    this.distances.length = this.points.length;
    let length = 0;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      positions.setXYZ(i, p.x, p.y, p.z);
      if (i > 0) length += p.distanceTo(this.points[i - 1]);
      distances.setX(i, length);
      this.distances[i] = length;
    }
    positions.needsUpdate = true;
    distances.needsUpdate = true;
    geometry.setDrawRange(0, this.points.length);
  }
  hide(): void { this.group.visible = false; this.sourcePath = []; }
  update(delta: number, origin: THREE.Vector3, showLine: boolean): void {
    this.elapsed += delta;
    this.phase = (this.phase + Math.min(delta, 0.1) * (this.reduced ? 0.25 : DOT_SPEED)) % DOT_SPACING;
    if (this.target && this.sourcePath.length
      && Math.hypot(origin.x - this.lastOrigin.x, origin.z - this.lastOrigin.z) > 0.0001) {
      this.lastOrigin.copy(origin);
      const direct = this.route.direct(origin, this.target);
      if (direct) {
        this.writePath(direct);
        this.directMode = true;
      } else {
        // 离开直达范围时恢复最近一次完整寻路，随后只让旧路线起点跟随。
        if (this.directMode) this.writePath(this.sourcePath);
        this.directMode = false;
        this.followOrigin(origin);
      }
    }
    if (!this.group.visible) return;
    const breath = Math.sin(this.elapsed * (this.reduced ? 1 : 1.6));
    this.ring.material.opacity = 0.72 + breath * (this.reduced ? 0.12 : 0.24);
    this.updateRing(1 + breath * (this.reduced ? 0.035 : 0.1));
    this.line.visible = showLine;
    this.dots.visible = showLine && this.points.length > 1;
    if (this.dots.visible && this.points.length > 1) {
      const length = this.distances[this.distances.length - 1];
      // 相位只按固定间距循环；从目标向后排点，路线缩短不会重排整串光点。
      const offset = DOT_SPACING - this.phase;
      this.dots.count = Math.min(24, Math.max(0, Math.ceil((length - offset) / DOT_SPACING)));
      for (let i = 0; i < this.dots.count; i++) {
        const remaining = offset + i * DOT_SPACING;
        const distance = length - remaining;
        let index = this.startIndex;
        while (index < this.points.length - 2 && this.distances[index + 1] <= distance) index++;
        const a = this.points[index], b = this.points[index + 1];
        const span = this.distances[index + 1] - this.distances[index];
        const t = span > 0 ? (distance - this.distances[index]) / span : 0;
        const fade = THREE.MathUtils.smoothstep(Math.min(distance, remaining), 0, 0.45);
        this.matrix.makeScale(fade, fade, fade);
        this.matrix.setPosition(THREE.MathUtils.lerp(a.x, b.x, t), THREE.MathUtils.lerp(a.y, b.y, t) + 0.12, THREE.MathUtils.lerp(a.z, b.z, t));
        this.dots.setMatrixAt(i, this.matrix);
      }
      this.dots.instanceMatrix.needsUpdate = true;
    }
  }
  private followOrigin(origin: THREE.Vector3): void {
    if (this.points.length < 2) return;
    let nearest = Infinity;
    for (let i = this.startIndex; i < this.points.length - 1; i++) {
      const a = this.points[i], b = this.points[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const squared = dx * dx + dz * dz;
      const t = squared > 0 ? THREE.MathUtils.clamp(((origin.x - a.x) * dx + (origin.z - a.z) * dz) / squared, 0, 1) : 0;
      const distance = (origin.x - a.x - dx * t) ** 2 + (origin.z - a.z - dz * t) ** 2;
      if (distance <= nearest) { nearest = distance; this.startIndex = i; }
    }
    this.points[this.startIndex].set(origin.x, origin.y + 0.16, origin.z);
    const geometry = this.line.geometry;
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const distances = geometry.getAttribute('lineDistance') as THREE.BufferAttribute;
    positions.setXYZ(this.startIndex, origin.x, origin.y + 0.16, origin.z);
    let length = 0;
    for (let i = this.startIndex; i < this.points.length; i++) {
      if (i > this.startIndex) length += this.points[i].distanceTo(this.points[i - 1]);
      this.distances[i] = length;
      distances.setX(i, length);
    }
    positions.needsUpdate = true;
    distances.needsUpdate = true;
    geometry.setDrawRange(this.startIndex, this.points.length - this.startIndex);
  }

  private updateRing(scale = 1): void {
    if (!this.target) return;
    const positions = this.ring.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const x = this.target.x + this.ringVertices[i * 3] * scale;
      const z = this.target.z - this.ringVertices[i * 3 + 1] * scale;
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
