import type { Vector3 } from 'three';
import type { Player, ActionType } from '../entities/Player';
import type { Prop, Props } from '../world/Props';
import { FRUIT_OF, SEED_OF } from '../world/TreeSpecies';
import type { CollectMeta } from '../meta/MetaHooks';
import { NO_COLLECT_META } from '../meta/MetaHooks';
import { Inventory, countsFromSlots, type ResourceKind } from './Inventory';
import type { Tools } from './Crafting';
import { axeHits, shovelHits, pickaxeHits, pickaxeUnlocked } from './ToolTiers';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import {
  DIG_YIELD,
  HARVEST_CONFIG,
  rollHarvestCount,
  type HarvestDrop,
  type HarvestKind,
} from './HarvestTable';

const COLLECT_RANGE = 1.6;
const SWING_TIME = 0.6; // 每次作业动作时长(秒)
/** 刮风天(风之加护)采集碎石堆/草丛/浆果丛多掉 1 份主产出的概率 */
const WIND_BONUS_CHANCE = 0.1;
/** 风之加护覆盖的资源点及其额外产出 */
const WIND_BONUS_YIELD: Partial<Record<'gravel' | 'grass' | 'berry', 'stone' | 'fiber' | 'berry'>> = {
  gravel: 'stone',
  grass: 'fiber',
  berry: 'berry',
};

/** 挂果中的果树(成树、未砍、持斧以外的状态靠近即摘果,持斧则正常砍树) */
function isFruitedTree(prop: Prop): boolean {
  return (
    prop.kind === 'tree' &&
    prop.species === 'fruit' &&
    prop.growth === 'mature' &&
    prop.stage !== 'stump' &&
    prop.fruited !== false
  );
}

export type HarvestInfo = { progress: number };
export function harvestPhase(prop: Prop): string {
  return `${prop.kind}:${prop.stage ?? ''}:${prop.growth ?? ''}:${prop.ready}:${prop.fruited ?? ''}`;
}

/** 站定在资源点范围内自动作业:播放动画、逐次命中推进进度,树/石需多次命中;移动即中断 */
export class CollectSystem {
  private nearby: Prop | null = null;
  private swingTimer = 0;
  /** 本帧是否真的在作业(update 里含让位判定后写入):让位期间(如弓瞄准中)不算占用,否则会把让位给它的系统反向挤掉 */
  private workingNow = false;
  /** 作业期间最后持有的动作,结束时只释放它 */
  private workAction: ActionType | null = null;
  /** 已命中次数记在资源点上,走开后回来可继续 */
  private hitCounts = new Map<Prop, number>();
  private hitPhases = new WeakMap<Prop, string>();
  private pending = new Map<string, string>();
  /** 客人只推进自身动作与命中；世界变化和产出由房主处理。 */
  submitHit?: (id: string, phase: string, done: (accepted: boolean) => void) => boolean;

  constructor(
    private player: Player,
    private props: Props,
    private inventory: Inventory,
    private tools: Tools,
    private give: (kind: ResourceKind, count: number) => number,
    private fx: Particles,
    private audio: GameAudio,
    /** 其他占用双手的行为(如合成中),为真时采集让位 */
    private isBusy: () => boolean = () => false,
    /** 将资源点处的命中/完成粒子同步给联机客人。 */
    private onFx: (position: Vector3, color: string, count: number) => void = () => {},
    /** 资源点产出入包时上报飞行起点(本地玩家的入包飞行表现用) */
    private onYield: (position: Vector3) => void = () => {},
    /** 蜂巢神龛叠层后的额外浆果概率(全岛生效) */
    private berryBonusChance: () => number = () => 0,
    /** 刮风天是否生效(风之加护:碎石堆/草丛/浆果丛概率额外 +1) */
    private windBlessed: () => boolean = () => false,
    /** 自然补种选点时需要避开的玩家位置(防树苗在玩家面前凭空出现穿帮) */
    private seedAvoidPlayers: () => readonly Vector3[] = () => [],
    /** 局外养成「采集·巧匠」加成(单机生效,联机为空实现) */
    private meta: CollectMeta = NO_COLLECT_META,
    private onCollected?: (kind: ResourceKind, count: number) => void,
    private onStoneHarvest?: (naturallyDropped: boolean) => boolean,
    private onDug?: (kind: Prop['kind']) => void
  ) {}

  /** 手持铲子靠近丛/蚯蚓窝时是在整棵挖走,而不是徒手采集/捉蚯蚓 */
  private isDigging(prop: Prop): boolean {
    return (
      this.player.currentTool === 'shovel' &&
      (prop.kind === 'berry' || prop.kind === 'shrub' || prop.kind === 'grass' || prop.kind === 'wormNest')
    );
  }

  /** 按资源点与手持工具判定作业种类:挂果果树在持斧时仍是砍树,其余状态空手可摘 */
  private kindOf(prop: Prop): HarvestKind {
    if (prop.kind !== 'tree') return prop.kind;
    if (prop.stage === 'stump') return 'stump';
    if (isFruitedTree(prop) && this.player.currentTool !== 'axe') return 'fruitTree';
    return 'tree';
  }

  /** 该资源点需要命中的总次数:斧/镐/铲子按当前工具等级查表(ToolTiers) */
  private hitsFor(prop: Prop): number {
    const kind = this.kindOf(prop);
    if (this.isDigging(prop)) return shovelHits(this.tools.shovel);
    if (kind === 'tree' || kind === 'stump') return axeHits(kind, this.tools.axe);
    if (kind === 'rock' || kind === 'iron' || kind === 'meteor') {
      return pickaxeHits(kind, this.tools.pickaxe);
    }
    return HARVEST_CONFIG[kind].hits;
  }

  /** 扫描范围内可交互的资源点,刷新 nearby(客人端也跑,用于自动切工具等本地判定) */
  scanNearby(): void {
    // 范围内优先选中当前可交互的资源点,避免被不可交互的挡住
    this.nearby = null;
    let fallback: Prop | null = null;
    const p = this.player.group.position;
    for (const prop of this.props.list) {
      const pending = this.pending.get(prop.id);
      if (pending === harvestPhase(prop)) continue;
      if (pending !== undefined) this.pending.delete(prop.id);
      // 未恢复的资源点不可交互,除非手持铲子(丛任何状态都能整棵挖走)
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
    const wasWorking = this.workingNow;
    this.workingNow = working;
    // 只在作业期间持有动作、结束时释放一次自己最后持有的动作;不作业时不能每帧清动作,
    // 否则会把挥剑/放箭等其他系统刚设的动作抹掉(动画只播一帧)
    if (working) {
      this.workAction = this.isDigging(this.nearby!) ? 'mine' : HARVEST_CONFIG[this.kindOf(this.nearby!)].action;
      this.player.setAction(this.workAction);
    } else if (wasWorking) {
      if (this.workAction) this.player.releaseAction(this.workAction);
      this.workAction = null;
    }
    if (!working) {
      this.swingTimer = 0;
      return;
    }

    // 每次挥动开始就给声音反馈(采集草丛/碎石/砍凿各有专属声),不等命中结算
    if (this.swingTimer === 0) {
      const kind = this.kindOf(this.nearby!);
      const action = HARVEST_CONFIG[kind].action;
      this.audio.play(action === 'chop' ? 'chop' : action === 'mine' ? 'mine' : kind === 'gravel' ? 'pickStone' : 'pick');
    }
    this.swingTimer += delta;
    if (this.swingTimer < SWING_TIME) return;
    this.swingTimer = 0;
    this.hit(this.nearby!);
  }

  /** 采摘后扫描可能转向旁边的普通树；范围内有果树时仍禁止自动拿斧头。 */
  hasNearbyFruitTree(): boolean {
    const position = this.player.group.position;
    return this.props.list.some((prop) => prop.kind === 'tree' && prop.species === 'fruit'
      && prop.position.distanceTo(position) < COLLECT_RANGE);
  }

  getDigTarget(): Prop['group'] | null {
    return this.workingNow && this.nearby && this.isDigging(this.nearby) ? this.nearby.group : null;
  }

  getNearby(): Prop | null {
    return this.nearby;
  }

  /** 是否正在作业(喝水等让位判定用;让位期间为假,见 workingNow) */
  get isWorking(): boolean {
    return this.workingNow;
  }

  /** 资源点是否可交互:树/大石块要求对应工具拿在手上 */
  canCollect(prop: Prop = this.nearby!): boolean {
    if (!prop || this.player.currentTool === 'shears') return false;
    const kind = this.kindOf(prop);
    if (kind === 'tree' || kind === 'stump') {
      return this.player.currentTool === 'axe';
    }
    // 镐类资源各有解锁等级:岩石任意镐,铁矿要石镐,陨石要铁镐
    if (prop.kind === 'rock' || prop.kind === 'iron' || prop.kind === 'meteor') {
      return this.player.currentTool === 'pickaxe' && pickaxeUnlocked(prop.kind, this.tools.pickaxe);
    }
    return true;
  }

  /** 当前作业进度 0-1(连续:已命中次数 + 本次挥动进度);仅作业期间有值,走近未作业时为 null,避免头顶常驻空进度环 */
  getHarvestInfo(): HarvestInfo | null {
    const prop = this.nearby;
    if (!prop || !this.workingNow) return null;
    const done = this.hitPhases.get(prop) === harvestPhase(prop) ? this.hitCounts.get(prop) ?? 0 : 0;
    const swing = Math.min(this.swingTimer / SWING_TIME, 1);
    return { progress: Math.min((done + swing) / this.hitsFor(prop), 1) };
  }

  /** 挂果果树当前是否会走空手摘果(供提示/自动切工具判定) */
  isPickingFruit(prop: Prop = this.nearby!): boolean {
    return !!prop && this.kindOf(prop) === 'fruitTree';
  }

  private hit(prop: Prop): void {
    const currentPhase = harvestPhase(prop);
    if (this.hitPhases.get(prop) !== currentPhase) {
      this.hitCounts.delete(prop);
      this.hitPhases.set(prop, currentPhase);
    }
    if (this.submitHit) {
      const phase = harvestPhase(prop);
      const config = HARVEST_CONFIG[this.kindOf(prop)];
      const hits = (this.hitCounts.get(prop) ?? 0) + 1;
      if (!this.submitHit(prop.id, phase, accepted => {
        if (!accepted) {
          this.hitCounts.delete(prop);
          if (this.pending.get(prop.id) === phase) this.pending.delete(prop.id);
        }
      })) return;
      this.fx.burst(prop.position, config.fxColor, 6);
      this.props.shake(prop);
      if (hits >= this.hitsFor(prop)) {
        this.hitCounts.delete(prop);
        this.pending.set(prop.id, phase);
        this.nearby = null;
      } else this.hitCounts.set(prop, hits);
      return;
    }
    const config = HARVEST_CONFIG[this.kindOf(prop)];
    this.fx.burst(prop.position, config.fxColor, 6);
    this.onFx(prop.position, config.fxColor, 6);
    this.props.shake(prop);
    const hits = (this.hitCounts.get(prop) ?? 0) + 1;
    if (hits < this.hitsFor(prop)) {
      this.hitCounts.set(prop, hits);
      return;
    }
    let flintDropped = false;
    const giveYield = (kind: ResourceKind, count: number) => {
      if (kind === 'flint' && count > 0) flintDropped = true;
      return this.give(kind, count);
    };
    const before = countsFromSlots(this.inventory.snapshot());
    this.hitCounts.delete(prop);
    this.onYield(prop.position);
    const kind = this.kindOf(prop);
    if (this.isPickingFruit(prop)) {
      // 空手摘果:只摘走果子,树保留并进入挂果再生
      this.props.pickFruit(prop);
      this.giveDrops(giveYield, prop, config.drops);
    } else if (this.isDigging(prop)) {
      // 铲子把整棵丛挖走,获得对应道具,资源点永久消失
      this.props.removeProp(prop);
      this.onDug?.(prop.kind);
      this.give(DIG_YIELD[prop.kind as 'berry' | 'shrub' | 'grass' | 'wormNest']!, 1);
    } else {
      const treeFelled = prop.kind === 'tree' && prop.stage !== 'stump';
      this.props.harvest(prop);
      this.giveDrops(giveYield, prop, config.drops);
      if (prop.kind === 'berry' && Math.random() < this.berryBonusChance()) {
        this.give('berry', 1);
      }
      // 风之加护:碎石堆/草丛/浆果丛按概率多掉 1 份主产出
      const windBonus = WIND_BONUS_YIELD[prop.kind as keyof typeof WIND_BONUS_YIELD];
      if (windBonus && this.windBlessed() && Math.random() < WIND_BONUS_CHANCE) {
        this.give(windBonus, 1);
      }
      // 砍倒成树第一阶段时,房主端在岛上别处自然补种一棵同树种(客人端由增量同步复现)
      if (treeFelled && prop.growth === 'mature') {
        this.props.seedRegrowTree(prop.species ?? 'oak', this.seedAvoidPlayers());
      }
    }
    this.applyMetaYield(prop, kind, config, giveYield);
    if (['rock', 'gravel', 'iron', 'meteor'].includes(kind) && this.onStoneHarvest?.(flintDropped)) {
      this.give('flint', 1);
    }
    for (const [resource, count] of Object.entries(countsFromSlots(this.inventory.snapshot()))) {
      const k = resource as ResourceKind;
      const gained = count - (before[k] ?? 0);
      if (gained > 0) this.onCollected?.(k, gained);
    }
    this.fx.burst(prop.position, config.fxColor, 14);
    this.onFx(prop.position, config.fxColor, 14);
    this.nearby = null;
  }

  settleHit(id: string, phase: string): boolean {
    const prop = this.props.list.find(candidate => candidate.id === id);
    if (!prop || harvestPhase(prop) !== phase || (!prop.ready && !this.isDigging(prop))
      || !this.canCollect(prop) || this.player.isMoving || this.player.isSwimming
      || prop.position.distanceTo(this.player.group.position) > COLLECT_RANGE + 0.2) return false;
    this.hit(prop);
    return true;
  }

  cancel(): void {
    if (this.workAction) this.player.releaseAction(this.workAction);
    this.workAction = null;
    this.swingTimer = 0;
    this.workingNow = false;
    this.pending.clear();
    this.hitCounts.clear();
  }

  /** 局外养成「采集·巧匠」的额外产出:在基础产出结算后追加(铲子整棵挖走不吃加成) */
  private applyMetaYield(
    prop: Prop,
    kind: HarvestKind,
    config: (typeof HARVEST_CONFIG)[HarvestKind],
    giveYield: (kind: ResourceKind, count: number) => number
  ): void {
    const { gleaning, rockWealth, seedline } = this.meta.levels;
    // 拾穗:草丛/灌木小概率额外 1 份本产出,摘果小概率多 1 个果实
    if (gleaning >= 1 && (kind === 'grass' || kind === 'shrub') && Math.random() < 0.1) {
      this.give(kind === 'grass' ? 'fiber' : 'branch', 1);
    }
    if (gleaning >= 2 && kind === 'fruitTree' && Math.random() < 0.1) {
      this.give(FRUIT_OF.fruit, 1);
    }
    // 碎石成金:岩石小概率多 1 块石头,铁矿必多 1 块铁,陨石小概率挖出珍宝
    if (rockWealth >= 1 && (kind === 'rock' || kind === 'gravel') && Math.random() < 0.1) {
      this.give('stone', 1);
    }
    if (rockWealth >= 2 && kind === 'iron') {
      this.give('ironOre', 1);
    }
    if (rockWealth >= 3 && kind === 'meteor' && Math.random() < 0.01) {
      this.meta.meteorTreasure();
    }
    // 良种:伐倒成树必多 1 根木头;2/3 级效果属于种植系统,见 CropSystem
    if (seedline >= 1 && kind === 'tree') {
      this.give('wood', 1);
    }
    // 拾穗满级:每天第一次采集,基础产出双倍(再结算一次产出表)
    if (gleaning >= 3 && !this.isDigging(prop) && this.meta.takeFirstCollect()) {
      this.giveDrops(giveYield, prop, config.drops);
    }
  }

  /** 掷点产出声明表,把结果入包:概率判定、随机取一、按树种映射与数量掷点都在这里结算 */
  private giveDrops(add: (kind: ResourceKind, count: number) => number, prop: Prop, drops: readonly HarvestDrop[]): void {
    const species = prop.species ?? 'oak';
    for (const drop of drops) {
      if (drop.chance !== undefined && drop.chance < 1 && Math.random() >= drop.chance) continue;
      if ('bySpecies' in drop) {
        add((drop.bySpecies === 'seed' ? SEED_OF : FRUIT_OF)[species], 1);
      } else if ('oneOf' in drop) {
        add(drop.oneOf[Math.floor(Math.random() * drop.oneOf.length)], 1);
      } else {
        add(drop.kind, rollHarvestCount(drop.count));
      }
    }
  }
}
