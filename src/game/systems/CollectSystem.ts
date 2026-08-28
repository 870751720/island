import type { Player, ActionType } from '../entities/Player';
import type { Prop, Props } from '../world/Props';
import { Inventory } from './Inventory';
import type { Particles } from '../fx/Particles';

const COLLECT_RANGE = 1.6;
const SWING_TIME = 0.6; // 每次作业动作时长(秒)

/** 作业对象种类:树桩是树的第二段,单独配置 */
type HarvestKind = Prop['kind'] | 'stump';

function kindOf(prop: Prop): HarvestKind {
  return prop.kind === 'tree' && prop.stage === 'stump' ? 'stump' : prop.kind;
}

/** 各资源点:作业动画、命中次数、命中特效色、产出 */
const HARVEST_CONFIG: Record<
  HarvestKind,
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
  stump: {
    action: 'chop',
    hits: 2,
    fxColor: '#8a6239',
    yield: (inv) => inv.add('wood', 1),
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
    private fx: Particles,
    /** 其他占用双手的行为(如合成中),为真时采集让位 */
    private isBusy: () => boolean = () => false
  ) {}

  update(delta: number): void {
    // 范围内优先选中当前可交互的资源点,避免被不可交互的挡住
    this.nearby = null;
    let fallback: Prop | null = null;
    const p = this.player.group.position;
    for (const prop of this.props.list) {
      if (!prop.ready) continue;
      if (prop.position.distanceTo(p) >= COLLECT_RANGE) continue;
      if (this.canCollect(prop)) {
        this.nearby = prop;
        break;
      }
      fallback ??= prop;
    }
    this.nearby ??= fallback;

    const working =
      !!this.nearby && this.canCollect(this.nearby) && !this.player.isMoving && !this.isBusy();
    this.player.setAction(working ? HARVEST_CONFIG[kindOf(this.nearby!)].action : null);
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

  /** 是否正在作业(喝水等让位判定用) */
  get isWorking(): boolean {
    return !!this.nearby && this.canCollect(this.nearby) && !this.player.isMoving;
  }

  /** 资源点是否可交互:树/大石块要求对应工具拿在手上 */
  canCollect(prop: Prop = this.nearby!): boolean {
    if (!prop) return false;
    const kind = kindOf(prop);
    if (kind === 'tree' || kind === 'stump') return this.player.currentTool === 'axe';
    if (prop.kind === 'rock') return this.player.currentTool === 'pickaxe';
    return true;
  }

  /** 当前作业进度 0-1(连续:已命中次数 + 本次挥动进度),无作业时为 null */
  getHarvestInfo(): HarvestInfo | null {
    const prop = this.nearby;
    if (!prop || !this.canCollect()) return null;
    const { hits } = HARVEST_CONFIG[kindOf(prop)];
    const done = this.hitCounts.get(prop) ?? 0;
    const swing = Math.min(this.swingTimer / SWING_TIME, 1);
    return { progress: Math.min((done + swing) / hits, 1) };
  }

  private hit(prop: Prop): void {
    const config = HARVEST_CONFIG[kindOf(prop)];
    this.fx.burst(prop.position, config.fxColor, 6);
    this.props.shake(prop);
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
