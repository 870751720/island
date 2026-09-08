import * as THREE from 'three';
import { hoeHits } from './ToolTiers';
import { CookingStation, BOIL_INTERVAL } from '../entities/CookingStation';
import type { ResourceKind } from './Inventory';
import { ITEMS } from './Items';
import { COOKABLE, BOILABLE } from './Food';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import { PROP_NAMES } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { cardinalRotY } from '../core/Facing';
import { ActionHold } from './ActionHold';

const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处摆放
const STATION_BLOCK_RANGE = 0.9; // 与其他烹饪台/火堆重叠距离小于该值时无处摆放
const NEAR_RANGE = 2.2; // 玩家距烹饪台小于该值时算在台旁
const DIG_RANGE = 1.6; // 持锄头可开挖烹饪台的距离
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)
const ROAST_TIME = 1.6; // 每份食物的烤制时长(秒)
const ROAST_TICK = 0.8; // 烤制翻动特效间隔(秒)

/** 烹饪台存档/网络快照(落点 + 燃料 + 煮制队列与产出) */
export type CookingStationSave = {
  id?: string;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  fuel: number;
  boilKind?: ResourceKind | null;
  boilQueue: number;
  tickLeft: number;
  outKind?: ResourceKind | null;
  outCount: number;
};

/** 身旁烹饪台的 HUD 快照 */
export type CookingStationInfo = {
  /** 是否在燃烧(只有燃着才能烤制/煮汤) */
  lit: boolean;
  /** 剩余燃烧秒数 */
  fuel: number;
  /** 正在煮的食材(空闲为 null) */
  boilKind: ResourceKind | null;
  /** 锅里剩余待煮份数 */
  boilLeft: number;
  /** 当前这份的煮制进度 0-1(空闲为 0) */
  boilProgress: number;
  /** 已煮好的汤品种类(无产出为 null) */
  outKind: ResourceKind | null;
  /** 台上存放的汤品数量 */
  outCount: number;
};

/** 每玩家的烤制/挖掘进度(烹饪台本身是世界共享的;煮制队列在台上) */
type PlayerSessionState = {
  hold: ActionHold;
  swingTimer: number;
  hits: number;
  digTarget: CookingStation | null;
  // 批量烤制:食材先收走,逐份烤熟入包;走开或火灭则退回剩余食材
  roastKind: ResourceKind | null;
  roastStation: CookingStation | null;
  roastQueue: number;
  roastTotal: number;
  roastTimer: number;
  roastTickTimer: number;
};

/**
 * 烹饪台系统(世界多实例,按发起者 actor 结算):
 * - 背包里点击「使用」烹饪台,在玩家脚下原地放下(放下时未点燃,与木箱同一套摆放规则);
 * - 添柴点燃后与火堆一样可烤制(玩家站定逐份烤,走开或火灭退回剩余食材);
 * - 另可发起「煮汤」:选一种食材和份数下锅,台子自己每 5 秒煮出 1 份存放在台上,
 *   同一时间只能煮一种食材,随时收取;燃尽则暂停,添柴续煮;
 * - 手持锄头靠近站定自动整台挖走(变回烹饪台道具,锅里剩余食材与煮好的汤一并回包)。
 * 燃料消耗与煮制计时只在权威端(单机/房主)结算,客人端由世界增量回流 + 本地倒数表现。
 */
export class CookingStationSystem {
  private stations: CookingStation[] = [];
  private scratch = new THREE.Vector3();
  private ids = new WorldEntityIds<CookingStation>('cook');
  private onChanged?: EntityChangeSink;
  private states = new Map<PlayerSession, PlayerSessionState>();

  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 收取汤品/挖回烹饪台与锅里食材入包(背包放不下的部分由该函数掉到地上) */
    private give: (kind: ResourceKind, count: number, actor: PlayerSession) => number,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isOtherBusy: (actor: PlayerSession) => boolean = () => false
  ) {}

  private st(actor: PlayerSession): PlayerSessionState {
    let st = this.states.get(actor);
    if (!st) {
      st = {
        hold: new ActionHold(),
        swingTimer: 0, hits: 0, digTarget: null,
        roastKind: null, roastStation: null, roastQueue: 0, roastTotal: 0, roastTimer: 0, roastTickTimer: 0,
      };
      this.states.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人进度(烤制中的剩余食材不退,由外层结算规则决定) */
  detach(actor: PlayerSession): void {
    this.states.delete(actor);
  }

  /** 场上烹饪台总数(手搓火堆卡片的弹出条件之一) */
  get count(): number {
    return this.stations.length;
  }

  /** 玩家身旁最近的烹饪台(范围内的),无则 null */
  nearby(actor: PlayerSession): CookingStation | null {
    let best: CookingStation | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const station of this.stations) {
      this.scratch.copy(station.group.position);
      this.scratch.y = actor.player.group.position.y;
      const d = this.scratch.distanceToSquared(actor.player.group.position);
      if (d < bestDist) {
        best = station;
        bestDist = d;
      }
    }
    return best;
  }

  /** 身旁烹饪台的状态快照(不在台旁为 null) */
  nearbyInfo(actor: PlayerSession): CookingStationInfo | null {
    const station = this.nearby(actor);
    if (!station) return null;
    return {
      lit: station.isLit,
      fuel: station.fuel,
      boilKind: station.boilKind,
      boilLeft: station.boilQueue,
      boilProgress: station.isBoiling ? 1 - Math.max(station.tickLeft, 0) / BOIL_INTERVAL : 0,
      outKind: station.outKind,
      outCount: station.outCount,
    };
  }

  /** 指定格中心是否允许摆放(不在水里/水边,格内没有被资源点或其他烹饪台占住) */
  canPlaceAt(actor: PlayerSession, x: number, z: number): string | null {
    const p = new THREE.Vector3(x, this.terrain.getHeight(x, z), z);
    if (actor.player.isSwimming) return '游泳时不能安放';
    if (this.terrain.isNearWater(p, 1)) return '离水太近';
    if (p.y <= 0) return '这里在水里';
    if (
      this.stations.some((station) => {
        this.scratch.copy(station.group.position);
        this.scratch.y = p.y;
        return this.scratch.distanceTo(p) < STATION_BLOCK_RANGE;
      })
    ) {
      return '离其他烹饪台太近';
    }
    const blocker = this.props.occupant(p, PROP_BLOCK_RANGE);
    return blocker ? `被${PROP_NAMES[blocker]}挡住` : null;
  }

  /** 在吸附格中心放下烹饪台(背包「使用」与手持自动安放共用入口,未点燃,需添柴引火) */
  use(actor: PlayerSession, at: THREE.Vector3): boolean {
    if (actor.inventory.count('cookingStation') <= 0 || !this.canPlaceAt(actor, at.x, at.z)) return false;
    actor.inventory.remove('cookingStation', 1);
    const station = this.placeAt(at, cardinalRotY(actor.player.group.rotation.y));
    this.audio.play('success');
    const fxPos = station.group.position.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#5c5f66', 10);
    return true;
  }

  private placeAt(position: THREE.Vector3, rotY: number): CookingStation {
    const station = new CookingStation(this.scene, position, rotY, 0);
    this.stations.push(station);
    this.emitAdd(station);
    return station;
  }

  /** 向身旁烹饪台添加 1 个可燃物,熄灭的台子添柴后复燃,返回增加的燃烧秒数,失败为 0 */
  addFuel(actor: PlayerSession, kind: ResourceKind): number {
    const station = this.nearby(actor);
    const burnTime = ITEMS[kind].burnTime;
    if (!station || !burnTime || !actor.inventory.remove(kind, 1)) return 0;
    const wasLit = station.isLit;
    station.fuel += burnTime;
    if (!wasLit) station.relight();
    this.emitState(station);
    this.audio.play('stoke');
    const p = station.group.position.clone();
    p.y += 0.5;
    this.fx.burst(p, '#ff9a3d', 6);
    return burnTime;
  }

  /** 在身旁燃烧的烹饪台上发起烤制(与火堆同一套:站定逐份烤,走开或火灭退回剩余食材) */
  startRoast(actor: PlayerSession, kind: ResourceKind, count: number): boolean {
    if (this.isBusy(actor) || count < 1) return false;
    const st = this.st(actor);
    const station = this.nearby(actor);
    const cooked = COOKABLE[kind];
    const owned = actor.inventory.count(kind);
    if (!station || !station.isLit || !cooked || owned < 1) return false;
    const n = Math.min(count, owned);
    actor.inventory.remove(kind, n);
    st.roastKind = kind;
    st.roastStation = station;
    st.roastQueue = n;
    st.roastTotal = n;
    st.roastTimer = 0;
    st.roastTickTimer = 0;
    return true;
  }

  /** 发起煮汤:选一种食材和份数下锅,台上每 5 秒煮好 1 份;锅里已有食材或火未燃时失败 */
  startBoil(actor: PlayerSession, kind: ResourceKind, count: number): 'ok' | 'busy' | 'notLit' | 'invalid' {
    const station = this.nearby(actor);
    const soup = BOILABLE[kind];
    const owned = actor.inventory.count(kind);
    if (!station || !soup || owned < 1 || count < 1) return 'invalid';
    if (!station.isLit) return 'notLit';
    if (station.boilKind) return 'busy';
    const n = Math.min(count, owned);
    actor.inventory.remove(kind, n);
    station.setBoiling(kind);
    station.boilQueue = n;
    station.tickLeft = BOIL_INTERVAL;
    this.emitState(station);
    this.audio.play('drop');
    return 'ok';
  }

  /** 收取身旁烹饪台上煮好的全部汤品,返回收取个数 */
  collect(actor: PlayerSession): number {
    const station = this.nearby(actor);
    if (!station || !station.outKind || station.outCount <= 0) return 0;
    const kind = station.outKind;
    const n = station.outCount;
    station.outKind = null;
    station.outCount = 0;
    this.emitState(station);
    this.give(kind, n, actor);
    this.audio.play('success');
    const p = station.group.position.clone();
    p.y += 0.9;
    this.fx.burst(p, '#ffcf5e', 8);
    return n;
  }

  /** 把身旁烹饪台锅里还没煮的食材取回背包,返回是否取回任何数量 */
  takeBoil(actor: PlayerSession): boolean {
    const station = this.nearby(actor);
    if (!station || station.boilKind === null || station.boilQueue <= 0) return false;
    const kind = station.boilKind;
    const n = station.boilQueue;
    station.boilKind = null;
    station.boilQueue = 0;
    station.tickLeft = BOIL_INTERVAL;
    this.emitState(station);
    this.give(kind, n, actor);
    this.audio.play('pickup');
    return true;
  }

  /** 是否正在烤制 */
  isRoasting(actor: PlayerSession): boolean {
    return (this.states.get(actor)?.roastKind ?? null) !== null;
  }

  /** 挖掘/烤制中(占用双手) */
  isBusy(actor: PlayerSession): boolean {
    return this.isRoasting(actor) || this.isDigging(actor);
  }

  /** 世界侧每帧更新:权威端结算燃料消耗与煮制产出,所有端推进特效表现 */
  update(delta: number, elapsed: number, authority: boolean): void {
    for (const station of this.stations) {
      const wasLit = station.isLit;
      if (station.isLit) station.fuel = Math.max(0, station.fuel - delta);
      if (station.isLit && station.boilQueue > 0) {
        station.tickLeft -= delta;
        if (authority && station.tickLeft <= 0) {
          station.boilQueue -= 1;
          station.tickLeft += BOIL_INTERVAL;
          const soup = station.boilKind ? BOILABLE[station.boilKind] : undefined;
          if (soup) {
            station.setOutput(soup);
            station.outKind = soup;
            station.outCount += 1;
          }
          if (station.boilQueue <= 0) station.boilKind = null;
          this.emitState(station);
          const p = station.group.position.clone();
          p.y += 1.0;
          this.fx.burst(p, '#ffcf5e', 4);
        }
      } else if (station.boilQueue > 0) {
        station.tickLeft = BOIL_INTERVAL;
      }
      if (wasLit && !station.isLit) {
        this.emitState(station);
      }
      station.update(elapsed);
    }
  }

  /** 每帧推进该玩家的烤制/挖掘;帧末统一提交持有的动作,交互结束时自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      this.updateDig(actor, st, delta);
      this.updateRoast(actor, st, delta);
    } finally {
      st.hold.commit(actor.player);
    }
  }

  private updateRoast(actor: PlayerSession, st: PlayerSessionState, delta: number): void {
    const kind = st.roastKind;
    const station = st.roastStation;
    if (!kind || !station) return;
    const fireGone = !station.isLit || this.nearby(actor) !== station;
    if (actor.player.isMoving || actor.player.isSwimming || fireGone) {
      // 中断:剩余食材原样退回
      actor.inventory.add(kind, st.roastQueue);
      st.roastKind = null;
      st.roastStation = null;
      return;
    }
    st.hold.hold(actor.player, 'cook');
    st.roastTimer += delta;
    st.roastTickTimer += delta;
    if (st.roastTickTimer >= ROAST_TICK) {
      st.roastTickTimer -= ROAST_TICK;
      this.audio.play('sizzle');
      const p = station.group.position.clone();
      p.y += 0.55;
      this.fx.burst(p, '#ffb84d', 3);
    }
    if (st.roastTimer >= ROAST_TIME) {
      this.give(COOKABLE[kind]!, 1, actor);
      st.roastTimer = 0;
      st.roastTickTimer = 0;
      st.roastQueue -= 1;
      if (st.roastQueue <= 0) {
        st.roastKind = null;
        st.roastStation = null;
        this.audio.play('success');
        const p = station.group.position.clone();
        p.y += 0.6;
        this.fx.burst(p, '#ffcf5e', 10);
      }
    }
  }

  /** 当前烤制进度 0-1(单份进度),空闲时为 null */
  getProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st) return null;
    return st.roastKind ? Math.min(st.roastTimer / ROAST_TIME, 1) : null;
  }

  /** 烤制排队总数与当前第几份(未在烤制时均为 0) */
  roastInfo(actor: PlayerSession): { total: number; current: number } {
    const st = this.states.get(actor);
    return {
      total: st?.roastTotal ?? 0,
      current: st?.roastKind ? st.roastTotal - st.roastQueue + 1 : 0,
    };
  }

  /** 正在烤制的食材名(未在烤制时为 null) */
  roastingKind(actor: PlayerSession): ResourceKind | null {
    return this.states.get(actor)?.roastKind ?? null;
  }

  /** 正在挖烹饪台 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.states.get(actor)?.digTarget;
  }

  /** 手持锄头站定在烹饪台旁自动挖掘,命中数次后整台挖走(锅里剩余食材与煮好的汤一并回包) */
  private updateDig(actor: PlayerSession, st: PlayerSessionState, delta: number): void {
    const p = actor.player.group.position;
    let target: CookingStation | null = null;
    if (
      actor.player.currentTool === 'hoe' &&
      !actor.player.isSwimming &&
      !st.roastKind &&
      !this.isOtherBusy(actor)
    ) {
      for (const station of this.stations) {
        this.scratch.copy(station.group.position);
        this.scratch.y = p.y;
        if (this.scratch.distanceTo(p) < DIG_RANGE) {
          target = station;
          break;
        }
      }
    }
    if (!target || actor.player.isMoving) {
      st.digTarget = null;
      st.swingTimer = 0;
      st.hits = 0;
      return;
    }
    st.digTarget = target;
    st.hold.hold(actor.player, 'mine');
    st.swingTimer += delta;
    if (st.swingTimer < SWING_TIME) return;
    st.swingTimer = 0;
    this.fx.burst(target.group.position, '#5c5f66', 6);
    st.hits += 1;
    if (st.hits < hoeHits(actor.tools.hoe)) return;
    st.hits = 0;
    st.digTarget = null;
    this.stations.splice(this.stations.indexOf(target), 1);
    this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
    this.scene.remove(target.group);
    target.dispose();
    this.give('cookingStation', 1, actor);
    if (target.boilKind && target.boilQueue > 0) this.give(target.boilKind, target.boilQueue, actor);
    if (target.outKind && target.outCount > 0) this.give(target.outKind, target.outCount, actor);
    this.audio.play('pickup');
    this.fx.burst(target.group.position, '#5c5f66', 14);
  }

  /** 当前挖烹饪台进度 0-1,未在挖掘时为 null */
  getDigProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st?.digTarget) return null;
    const need = hoeHits(actor.tools.hoe);
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  /** 时间快进(睡觉跳到第二天):燃料按跳过的秒数继续烧,煮制暂停(燃尽即熄) */
  passTime(seconds: number): void {
    for (const station of this.stations) {
      station.fuel = Math.max(0, station.fuel - seconds);
      if (!station.isLit && station.boilQueue > 0) station.tickLeft = BOIL_INTERVAL;
      this.emitState(station);
    }
  }

  /** 当前所有烹饪台的存档快照 */
  snapshot(): CookingStationSave[] {
    return this.stations.map((station) => {
      const p = station.group.position;
      return {
        id: this.ids.get(station), x: p.x, y: p.y, z: p.z, rotY: station.group.rotation.y,
        fuel: station.fuel,
        boilKind: station.boilKind, boilQueue: station.boilQueue, tickLeft: station.tickLeft,
        outKind: station.outKind, outCount: station.outCount,
      };
    });
  }

  /** 清空场上全部烹饪台(客人侧重放世界快照前调用) */
  clear(): void {
    for (const station of this.stations) {
      this.scene.remove(station.group);
      station.dispose();
    }
    this.stations = [];
  }

  /** 从存档恢复全部烹饪台(含燃料与锅里状态) */
  restore(list: CookingStationSave[]): void {
    for (const s of list) {
      const station = new CookingStation(this.scene, new THREE.Vector3(s.x, s.y, s.z), s.rotY ?? 0, s.fuel);
      this.ids.set(station, s.id);
      station.netApply({
        fuel: s.fuel,
        boilKind: s.boilKind ?? null,
        boilQueue: s.boilQueue,
        tickLeft: s.tickLeft,
        outKind: s.outKind ?? null,
        outCount: s.outCount,
      });
      this.stations.push(station);
    }
  }

  /** 客人端按稳定 id 原地增删改 */
  netApply(list: CookingStationSave[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.stations.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.stations[i]))) continue;
      this.scene.remove(this.stations[i].group);
      this.stations[i].dispose();
      this.stations.splice(i, 1);
    }
    const current = new Map(this.stations.map((station) => [this.ids.get(station), station]));
    for (const value of list) {
      const existed = value.id ? current.get(value.id) : undefined;
      let station = existed;
      if (!station) {
        station = new CookingStation(this.scene, new THREE.Vector3(value.x, value.y, value.z), value.rotY ?? 0, value.fuel);
        this.ids.set(station, value.id);
        this.stations.push(station);
      }
      // 客人端补播:快照回流发现汤品增加(房主已煮好一份)时本地放一次粒子,与房主端同款(初次同步的新台不播)
      if (existed && value.outCount > station.outCount) {
        const p = station.group.position.clone();
        p.y += 1.0;
        this.fx.burst(p, '#ffcf5e', 4);
      }
      station.netApply({
        fuel: value.fuel,
        boilKind: value.boilKind ?? null,
        boilQueue: value.boilQueue,
        tickLeft: value.tickLeft,
        outKind: value.outKind ?? null,
        outCount: value.outCount,
      });
    }
  }

  private emitAdd(station: CookingStation): void {
    const p = station.group.position;
    this.onChanged?.({
      op: 'add',
      id: this.ids.get(station),
      value: {
        id: this.ids.get(station), x: p.x, y: p.y, z: p.z, rotY: station.group.rotation.y,
        fuel: station.fuel, boilKind: station.boilKind, boilQueue: station.boilQueue,
        tickLeft: station.tickLeft, outKind: station.outKind, outCount: station.outCount,
      },
    });
  }

  /** 台上状态单独上报,网络层只下发变化字段 */
  private emitState(station: CookingStation): void {
    this.onChanged?.({
      op: 'set',
      id: this.ids.get(station),
      fields: {
        fuel: station.fuel,
        boilKind: station.boilKind,
        boilQueue: station.boilQueue,
        tickLeft: station.tickLeft,
        outKind: station.outKind,
        outCount: station.outCount,
      },
    });
  }
}
