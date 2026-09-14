import type * as THREE from 'three';
import { GuidanceEffect } from './GuidanceEffect';
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
  private effect: GuidanceEffect;
  private route: QuestRoute;
  private idle = 0;
  private scan = 0;
  private key = '';
  private activity = -1;
  constructor(private scene: THREE.Scene, private terrain: IslandTerrain, private props: Props, private wildlife: Wildlife, private bench: WorkbenchSystem, private drops: DropSystem, private campfire: CampfireSystem) {
    this.route = new QuestRoute(terrain);
    this.effect = new GuidanceEffect(scene, terrain, this.route);
  }
  update(delta: number, session: PlayerSession, photo: boolean, suppressed = false): void {
    const q = session.quests.view, guide = q?.guide;
    if (suppressed || !q?.enabled || !loadQuestGuide() || q.finished || !guide || guide.type === 'drink' || photo || session.survival.state.dead || session.player.isSwimming) {
      this.hint = null;
      this.effect.hide(); this.idle = 0; this.scan = 0; return;
    }
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
          const yields: ResourceKind[] = p.kind === 'shrub' ? ['branch'] : p.kind === 'grass' ? ['fiber'] : p.kind === 'gravel' ? ['stone', 'flint'] : p.kind === 'rock' && session.tools.pickaxe ? ['stone', 'flint'] : p.kind === 'tree' && p.species !== 'fruit' && session.tools.axe && (!p.growth || p.growth === 'mature') ? ['wood', 'branch'] : [];
          if (yields.some(k => kinds.includes(k))) targets.push(p.position);
        }
      }
      const origin = session.player.group.position;
      let path = this.route.find({ x: origin.x, z: origin.z }, targets, 1);
      if (!path && guide.type === 'resource' && (guide.kinds.includes('fur') || guide.kinds.includes('gameMeat'))) path = this.route.find({ x: origin.x, z: origin.z }, this.wildlife.guideSheep(), 0);
      this.hint = path ? null : guide.type === 'bench'
        ? '暂未找到可到达的工作台，请先放下对应等级的工作台。'
        : guide.type === 'campfire' ? '请先放下火堆，并添柴点燃。'
        : (guide.kinds.includes('fur') || guide.kinds.includes('gameMeat')) ? '暂未找到可到达的羊或皮毛，继续探索岛屿。' : '暂未找到可到达的物资，继续探索岛屿。';
      this.effect.setPath(path);
    }
    this.effect.update(delta, session.player.group.position, this.idle >= (guide.type === 'resource' ? 10 : 20) && !q.busy);
  }
  dispose(): void { this.effect.dispose(); }
}
