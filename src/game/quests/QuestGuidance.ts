import * as THREE from 'three';
import type { PlayerSession } from '../mp/PlayerSession';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Wildlife } from '../entities/Wildlife';
import type { WorkbenchSystem } from '../systems/WorkbenchSystem';
import type { DropSystem } from '../systems/DropSystem';
import type { ResourceKind } from '../systems/Inventory';
import type { CampfireSystem } from '../systems/CampfireSystem';
import { QuestRoute } from './QuestRoute';
import { loadQuestGuide } from './QuestSettings';

/** 本地轻量表现：一个目标光圈、一条虚线、固定数量流动光点；不改世界材质。 */
export class QuestGuidance {
  hint: string | null = null;
  private target: { x: number; z: number } | null = null;
  private group = new THREE.Group();
  private ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.88, 32), new THREE.MeshBasicMaterial({ color: '#d9eab6', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
  private line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#e8d8a2', transparent: true, opacity: 0.8, dashSize: 0.5, gapSize: 0.35, depthWrite: false }));
  private dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 6, 4), new THREE.MeshBasicMaterial({ color: '#fff4c9', transparent: true, opacity: 0.95, depthWrite: false, depthTest: false }), 24);
  private distances: number[] = [];
  private ringVertices = new Float32Array(this.ring.geometry.getAttribute('position').array);
  private matrix = new THREE.Matrix4();
  private route: QuestRoute;
  private points: THREE.Vector3[] = [];
  private idle = 0;
  private elapsed = 0;
  private scan = 0;
  private key = '';
  private activity = -1;
  private reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(private scene: THREE.Scene, private terrain: IslandTerrain, private props: Props, private wildlife: Wildlife, private bench: WorkbenchSystem, private drops: DropSystem, private campfire: CampfireSystem) {
    this.route = new QuestRoute(terrain);
    this.ring.renderOrder = 10;
    this.dots.renderOrder = 11;
    this.ring.frustumCulled = false;
    this.line.frustumCulled = false;
    this.dots.frustumCulled = false;
    this.group.add(this.ring, this.line, this.dots);
    this.group.visible = false;
    scene.add(this.group);
  }
  update(delta: number, session: PlayerSession, photo: boolean): void {
    const q = session.quests.view, guide = q?.guide;
    if (!q?.enabled || !loadQuestGuide() || q.finished || !guide || photo || session.survival.state.dead || session.player.isSwimming) {
      this.hint = null;
      this.group.visible = false; this.idle = 0; this.scan = 0; return;
    }
    this.elapsed += delta;
    const key = `${q.active}:${JSON.stringify(guide)}`;
    if (key !== this.key || q.activity !== this.activity || q.busy) {
      this.idle = 0;
      if (key !== this.key) this.scan = 0;
      this.key = key; this.activity = q.activity;
    } else this.idle += delta;
    this.scan -= delta;
    if (this.scan <= 0) {
      this.scan = 1;
      let targets: { x: number; z: number }[] = [];
      if (guide.type === 'bench') targets = this.bench.snapshot().filter(b => b.level >= guide.level);
      else if (guide.type === 'campfire') targets = this.campfire.snapshot().filter(f => guide.action === 'fuel' || f.fuel > 0);
      else {
        const kinds = guide.kinds;
        // 已掉落的皮毛优先；没有可到达的皮毛再找羊。
        const dropped = this.drops.snapshot().filter(d => kinds.includes(d.kind));
        targets = dropped;
        for (const p of this.props.list) {
          if (!p.ready) continue;
          const yields: ResourceKind[] = p.kind === 'shrub' ? ['branch'] : p.kind === 'grass' ? ['fiber'] : p.kind === 'gravel' ? ['stone', 'flint'] : p.kind === 'rock' && session.tools.pickaxe ? ['stone', 'flint'] : p.kind === 'tree' && session.tools.axe && (!p.growth || p.growth === 'mature') ? ['wood', 'branch'] : [];
          if (yields.some(k => kinds.includes(k))) targets.push(p.position);
        }
      }
      const origin = session.player.group.position;
      let path = this.route.find({ x: origin.x, z: origin.z }, targets, 1);
      if (!path && guide.type === 'resource' && (guide.kinds.includes('fur') || guide.kinds.includes('gameMeat'))) path = this.route.find({ x: origin.x, z: origin.z }, this.wildlife.guideSheep(), 0);
      this.target = path?.[path.length - 1] ?? null;
      this.hint = path ? null : guide.type === 'bench'
        ? '暂未找到可到达的工作台，请先放下对应等级的工作台。'
        : guide.type === 'campfire' ? '请先放下火堆，并添柴点燃。'
        : (guide.kinds.includes('fur') || guide.kinds.includes('gameMeat')) ? '暂未找到可到达的羊或皮毛，继续探索岛屿。' : '暂未找到可到达的物资，继续探索岛屿。';
      this.points = path?.map(p => new THREE.Vector3(p.x, this.terrain.getHeight(p.x, p.z) + 0.16, p.z)) ?? [];
      this.group.visible = this.points.length > 0;
      if (this.points.length) {
        this.updateRing();
        this.line.geometry.dispose();
        this.line.geometry = new THREE.BufferGeometry().setFromPoints(this.points);
        this.line.computeLineDistances();
      }
    }
    if (!this.group.visible) return;
    if (this.target && this.points.length > 1) {
      const origin = session.player.group.position;
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
    const showLine = this.idle >= (guide.type === 'resource' ? 10 : 20) && !q.busy;
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
