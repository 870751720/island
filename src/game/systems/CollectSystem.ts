import type { Player, ActionType } from '../entities/Player';
import type { Prop, Props } from '../world/Props';
import { Inventory } from './Inventory';
import type { Tools } from './Crafting';
import type { Particles } from '../fx/Particles';

const COLLECT_RANGE = 1.6;
const SWING_TIME = 0.6; // 每次作业动作时长(秒)

/** 各资源点:作业动画、命中次数、命中特效色、产出 */
const HARVEST_CONFIG: Record<
  Prop['kind'],
  {
    action: ActionType;
    hits: number;
    fxColor: string;
    yield: (inventory: Inventory) => void;
  }
> = {
  tree: {
    action: 'chop',
    hits: 3,
    fxColor: '#4f9440',
    yield: (inv) => inv.add('wood', 3),
  },
  rock: {
    action: 'mine',
    hits: 4,
    fxColor: '#9a9a9a',
    yield: (inv) => inv.add('stone', 2),
  },
  gravel: {
    action: 'pick',
    hits: 1,
    fxColor: '#b5b0a8',
    yield: (inv) => inv.add('gravel', 2),
  },
  berry: {
    action: 'pick',
    hits: 1,
    fxColor: '#c0392b',
    yield: (inv) => inv.add('berry', 1),
  },
  shrub: {
    action: 'pick',
    hits: 2,
    fxColor: '#6b8f4e',
    yield: (inv) => inv.add('wood', 1),
  },
};

export type HarvestInfo = { progress: number };

/** 站定在资源点范围内自动作业:播放动画、逐次命中推进进度,树/石需多次命中;移动即中断 */
export class CollectSystem {
  private nearby: Prop | null = null;
  private swingTimer = 0;
  /** 已命中次数记在资源点上,走开后回来可继续 */
  private hitCounts = new Map<Prop, number>();

  constructor(
    private player: Player,
    private props: Props,
    private inventory: Inventory,
    private tools: Tools,
    private fx: Particles
  ) {}

  update(delta: number): void {
    this.nearby = null;
    const p = this.player.group.position;
    for (const prop of this.props.list) {
      if (!prop.ready) continue;
      if (prop.position.distanceTo(p) < COLLECT_RANGE) {
        this.nearby = prop;
        break;
      }
    }

    const working = !!this.nearby && this.canCollect() && !this.player.isMoving;
    this.player.setAction(working ? HARVEST_CONFIG[this.nearby!.kind].action : null);
    if (!working) {
      this.swingTimer = 0;
      return;
    }

    this.swingTimer += delta;
    if (this.swingTimer < SWING_TIME) return;
    this.swingTimer = 0;
    this.hit(this.nearby!);
  }

  getNearby(): Prop | null {
    return this.nearby;
  }

  /** 当前是否满足附近资源点的工具要求 */
  canCollect(): boolean {
    const prop = this.nearby;
    if (!prop) return false;
    if (prop.kind === 'tree') return this.tools.axe;
    if (prop.kind === 'rock') return this.tools.pickaxe;
    return true;
  }

  /** 当前作业进度 0-1(用于 UI),无作业时为 null */
  getHarvestInfo(): HarvestInfo | null {
    const prop = this.nearby;
    if (!prop || !this.canCollect()) return null;
    const { hits } = HARVEST_CONFIG[prop.kind];
    return { progress: (this.hitCounts.get(prop) ?? 0) / hits };
  }

  private hit(prop: Prop): void {
    const config = HARVEST_CONFIG[prop.kind];
    this.fx.burst(prop.position, config.fxColor, 6);
    const hits = (this.hitCounts.get(prop) ?? 0) + 1;
    if (hits < config.hits) {
      this.hitCounts.set(prop, hits);
      return;
    }
    this.hitCounts.delete(prop);
    this.props.harvest(prop);
    config.yield(this.inventory);
    this.fx.burst(prop.position, config.fxColor, 14);
    this.nearby = null;
  }
}
