import * as THREE from 'three';
import type { PlayerSession } from '../mp/PlayerSession';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Wildlife } from '../entities/Wildlife';
import type { WorkbenchSystem } from '../systems/WorkbenchSystem';
import type { DropSystem } from '../systems/DropSystem';
import type { ResourceKind } from '../systems/Inventory';
import { QuestRoute } from './QuestRoute';
import { loadQuestGuide } from './QuestSettings';

/** 本地轻量表现：一个目标光圈、一条虚线、固定数量流动光点；不改世界材质。 */
export class QuestGuidance {
  hint: string | null = null;
  private target: { x: number; z: number } | null = null;
  private group = new THREE.Group();
  private ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.88, 32), new THREE.MeshBasicMaterial({ color: '#d9eab6', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  private line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#e8d8a2', transparent: true, opacity: 0.7, dashSize: 0.5, gapSize: 0.35, depthWrite: false }));
  private dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 4, 3), new THREE.MeshBasicMaterial({ color: '#fff4c9', depthWrite: false }), 24);
  private matrix = new THREE.Matrix4();
  private route: QuestRoute;
  private points: THREE.Vector3[] = [];
  private idle = 0;
  private elapsed = 0;
  private scan = 0;
  private key = '';
  private activity = -1;
  private reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(private scene: THREE.Scene, private terrain: IslandTerrain, private props: Props, private wildlife: Wildlife, private bench: WorkbenchSystem, private drops: DropSystem) {
    this.route = new QuestRoute(terrain);
    this.ring.rotation.x = -Math.PI / 2;
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
      if (!path && guide.type === 'resource' && guide.kinds.includes('fur')) path = this.route.find({ x: origin.x, z: origin.z }, this.wildlife.guideSheep(), 0);
      this.target = path?.[path.length - 1] ?? null;
      this.hint = path ? null : guide.type === 'bench'
        ? '暂未找到可到达的工作台，请先放下对应等级的工作台。'
        : guide.kinds.includes('fur') ? '暂未找到可到达的羊或皮毛，继续探索岛屿。' : '暂未找到可到达的物资，继续探索岛屿。';
      this.points = path?.map(p => new THREE.Vector3(p.x, this.terrain.getHeight(p.x, p.z) + 0.16, p.z)) ?? [];
      this.group.visible = this.points.length > 0;
      if (this.points.length) {
        this.ring.position.copy(this.points[this.points.length - 1]);
        this.line.geometry.dispose();
        this.line.geometry = new THREE.BufferGeometry().setFromPoints(this.points);
        this.line.computeLineDistances();
      }
    }
    if (!this.group.visible) return;
    if (this.target && this.points.length > 1) {
      this.ring.position.set(this.target.x, this.terrain.getHeight(this.target.x, this.target.z) + 0.16, this.target.z);
      const origin = session.player.group.position;
      this.points[0].set(origin.x, origin.y + 0.16, origin.z);
      this.points[this.points.length - 1].copy(this.ring.position);
      const positions = this.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      positions.setXYZ(0, this.points[0].x, this.points[0].y, this.points[0].z);
      positions.setXYZ(this.points.length - 1, this.ring.position.x, this.ring.position.y, this.ring.position.z);
      positions.needsUpdate = true;
    }
    this.ring.scale.setScalar(this.reduced ? 1 : 1 + Math.sin(this.elapsed * 3) * 0.06);
    const showLine = this.idle >= (guide.type === 'bench' ? 20 : 10) && !q.busy;
    this.line.visible = showLine;
    this.dots.visible = showLine && !this.reduced;
    if (this.dots.visible && this.points.length > 1) {
      for (let i = 0; i < 24; i++) {
        const t = ((i / 24 + this.elapsed * 0.06) % 1) * (this.points.length - 1);
        const index = Math.floor(t);
        const a = this.points[index], b = this.points[Math.min(index + 1, this.points.length - 1)];
        this.matrix.makeTranslation(THREE.MathUtils.lerp(a.x, b.x, t - index), THREE.MathUtils.lerp(a.y, b.y, t - index) + 0.08, THREE.MathUtils.lerp(a.z, b.z, t - index));
        this.dots.setMatrixAt(i, this.matrix);
      }
      this.dots.instanceMatrix.needsUpdate = true;
    }
  }
  dispose(): void {
    this.scene.remove(this.group);
    for (const object of [this.ring, this.line, this.dots]) { object.geometry.dispose(); object.material.dispose(); }
    this.dots.dispose();
  }
}
