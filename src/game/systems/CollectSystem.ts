import type { Vector3 } from 'three';
import type { Player, ActionType } from '../entities/Player';
import type { Prop, Props } from '../world/Props';
import {
  FRUIT_DROP_CHANCE,
  FRUIT_OF,
  SEED_DROP_CHANCE,
  SEED_OF,
} from '../world/TreeSpecies';
import { Inventory } from './Inventory';
import type { Tools } from './Crafting';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';

const COLLECT_RANGE = 1.6;
const SWING_TIME = 0.6; // 每次作业动作时长(秒)
const FLINT_CHANCE = 0.25; // 采集石类资源点时额外蹦出燧石的概率
const DIG_HITS = 2; // 锄头挖丛的命中次数(精致石锄 1 次)
/** 锄头挖走的丛对应的道具 */
const DIG_YIELD: Partial<
  Record<'berry' | 'shrub' | 'grass', 'berryBush' | 'shrubBush' | 'grassTuft'>
> = {
  berry: 'berryBush',
  shrub: 'shrubBush',
  grass: 'grassTuft',
};

/** 作业对象种类:树桩是成树的第二段、小树是树的幼年段,单独配置 */
type HarvestKind = Prop['kind'] | 'stump' | 'sapling';

function kindOf(prop: Prop): HarvestKind {
  if (prop.kind !== 'tree') return prop.kind;
  if (prop.stage === 'stump') return 'stump';
  if (prop.growth === 'sapling') return 'sapling';
  return 'tree';
}

/** 各资源点:作业动画、命中次数、命中特效色、产出 */
const HARVEST_CONFIG: Record<
  HarvestKind,
  {
    action: ActionType;
    hits: number;
    fxColor: string;
    yield: (inventory: Inventory, prop: Prop) => void;
  }
> = {
  tree: {
    action: 'chop',
    hits: 3,
    fxColor: '#4f9440',
    yield: (inv, prop) => {
      inv.add('wood', 2);
      inv.add('log', 1);
      // 第一阶段砍倒树冠时,按树种概率掉落种子与可食用果实
      const species = prop.species ?? 'oak';
      if (Math.random() < SEED_DROP_CHANCE) inv.add(SEED_OF[species], 1);
      if (Math.random() < FRUIT_DROP_CHANCE) inv.add(FRUIT_OF[species], 1);
    },
  },
  sapling: {
    action: 'chop',
    hits: 1,
    fxColor: '#7fae55',
    yield: (inv) => {
      inv.add('wood', 1);
    },
  },
  stump: {
    action: 'chop',
    hits: 2,
    fxColor: '#8a6239',
    yield: (inv) => {
      inv.add('wood', 1);
      inv.add('log', 2);
    },
  },
  rock: {
    action: 'mine',
    hits: 4,
    fxColor: '#9a9a9a',
    yield: (inv) => {
      inv.add('stone', 2);
      if (Math.random() < FLINT_CHANCE) inv.add('flint', 1);
    },
  },
  meteor: {
    action: 'mine',
    hits: 4,
    fxColor: '#e8703a',
    yield: (inv) => {
      inv.add('stone', 2);
      if (Math.random() < FLINT_CHANCE) inv.add('flint', 1);
    },
  },
  gravel: {
    action: 'pick',
    hits: 1,
    fxColor: '#b5b0a8',
    yield: (inv) => {
      inv.add('stone', 2);
      if (Math.random() < FLINT_CHANCE) inv.add('flint', 1);
    },
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
  grass: {
    action: 'pick',
    hits: 1,
    fxColor: '#a4c46a',
    yield: (inv) => inv.add('fiber', 1),
  },
  worm: {
    action: 'mine',
    hits: 1,
    fxColor: '#6b4f35',
    yield: (inv) => inv.add('bait', 1 + Math.floor(Math.random() * 3)),
  },
};

export type HarvestInfo = { progress: number };

/** 精致斧/镐对应的各资源点命中次数(比基础工具少敲几下) */
const REFINED_HITS: Partial<Record<HarvestKind, number>> = {
  tree: 2,
  stump: 1,
  rock: 3,
  meteor: 3,
};

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
    private fx: Particles,
    private audio: GameAudio,
    /** 其他占用双手的行为(如合成中),为真时采集让位 */
    private isBusy: () => boolean = () => false,
    /** 将资源点处的命中/完成粒子同步给联机客人。 */
    private onFx: (position: Vector3, color: string, count: number) => void = () => {},
    /** 资源点产出入包时上报飞行起点(本地玩家的入包飞行表现用) */
    private onYield: (position: Vector3) => void = () => {}
  ) {}

  /** 手持锄头靠近浆果丛/灌木丛/草丛时是在挖整棵丛,而不是徒手采集 */
  private isDigging(prop: Prop): boolean {
    return (
      this.player.currentTool === 'hoe' &&
      (prop.kind === 'berry' || prop.kind === 'shrub' || prop.kind === 'grass')
    );
  }

  /** 该资源点需要命中的总次数:精致斧/镐比基础工具少 1 次,精致锄 1 下挖走 */
  private hitsFor(prop: Prop): number {
    const kind = kindOf(prop);
    if (this.isDigging(prop)) return this.tools.hoe >= 2 ? 1 : DIG_HITS;
    if (!REFINED_HITS[kind]) return HARVEST_CONFIG[kind].hits;
    const refined =
      kind === 'tree' || kind === 'stump'
        ? this.tools.axe >= 2
        : this.tools.pickaxe >= 2;
    return refined ? REFINED_HITS[kind]! : HARVEST_CONFIG[kind].hits;
  }

  /** 扫描范围内可交互的资源点,刷新 nearby(客人端也跑,用于自动切工具等本地判定) */
  scanNearby(): void {
    // 范围内优先选中当前可交互的资源点,避免被不可交互的挡住
    this.nearby = null;
    let fallback: Prop | null = null;
    const p = this.player.group.position;
    for (const prop of this.props.list) {
      // 未恢复的资源点不可交互,除非手持锄头(丛任何状态都能整棵挖走)
      if (!prop.ready && !this.isDigging(prop)) continue;
      if (prop.position.distanceTo(p) >= COLLECT_RANGE) continue;
      if (this.canCollect(prop)) {
        this.nearby = prop;
        break;
      }
      fallback ??= prop;
    }
    this.nearby ??= fallback;
  }

  update(delta: number): void {
    this.scanNearby();

    const working =
      !!this.nearby && this.canCollect(this.nearby) && !this.player.isMoving && !this.isBusy();
    this.player.setAction(
      working
        ? this.nearby && this.isDigging(this.nearby)
          ? 'mine'
          : HARVEST_CONFIG[kindOf(this.nearby!)].action
        : null
    );
    if (!working) {
      this.swingTimer = 0;
      return;
    }

    // 每次挥动开始就给声音反馈(采集草丛/碎石/砍凿各有专属声),不等命中结算
    if (this.swingTimer === 0) {
      const kind = kindOf(this.nearby!);
      const action = HARVEST_CONFIG[kind].action;
      this.audio.play(action === 'chop' ? 'chop' : action === 'mine' ? 'mine' : kind === 'gravel' ? 'pickStone' : 'pick');
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
    if (kind === 'tree' || kind === 'stump' || kind === 'sapling') {
      return this.player.currentTool === 'axe';
    }
    if (prop.kind === 'rock' || prop.kind === 'meteor') return this.player.currentTool === 'pickaxe';
    // 蚯蚓土坑要用锄头挖
    if (prop.kind === 'worm') return this.player.currentTool === 'hoe';
    return true;
  }

  /** 当前作业进度 0-1(连续:已命中次数 + 本次挥动进度),无作业时为 null */
  getHarvestInfo(): HarvestInfo | null {
    const prop = this.nearby;
    if (!prop || !this.canCollect()) return null;
    const done = this.hitCounts.get(prop) ?? 0;
    const swing = Math.min(this.swingTimer / SWING_TIME, 1);
    return { progress: Math.min((done + swing) / this.hitsFor(prop), 1) };
  }

  private hit(prop: Prop): void {
    const config = HARVEST_CONFIG[kindOf(prop)];
    this.fx.burst(prop.position, config.fxColor, 6);
    this.onFx(prop.position, config.fxColor, 6);
    this.props.shake(prop);
    const hits = (this.hitCounts.get(prop) ?? 0) + 1;
    if (hits < this.hitsFor(prop)) {
      this.hitCounts.set(prop, hits);
      return;
    }
    this.hitCounts.delete(prop);
    this.onYield(prop.position);
    if (this.isDigging(prop)) {
      // 锄头把整棵丛挖走,获得对应道具,资源点永久消失
      this.props.removeProp(prop);
      this.inventory.add(DIG_YIELD[prop.kind as 'berry' | 'shrub' | 'grass']!, 1);
    } else {
      this.props.harvest(prop);
      config.yield(this.inventory, prop);
    }
    this.audio.play('pickup');
    this.fx.burst(prop.position, config.fxColor, 14);
    this.onFx(prop.position, config.fxColor, 14);
    this.nearby = null;
  }
}
