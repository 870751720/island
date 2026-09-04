import * as THREE from 'three';
import { Campfire } from '../entities/Campfire';
import type { ResourceKind } from './Inventory';
import { ITEMS } from './Items';
import { COOKABLE } from './Food';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';

const CRAFT_TIME = 2.4; // 搭建火堆总时长(秒)
const CRAFT_TICK = 0.6; // 每次敲击特效间隔(秒)
const FX_COLOR = '#e0862e';
const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处落脚摆放
const NEAR_RANGE = 2.2; // 玩家距火堆小于该值时算在火堆旁
export const CAMPFIRE_COST = { flint: 1, log: 2 };
/** 火堆卡片在手搓卡片中的弹出优先级(数值含义同 Recipe.promptPriority) */
export const CAMPFIRE_PROMPT_PRIORITY = 5;
const INITIAL_FUEL = 60; // 搭好时引燃的初始燃烧秒数
const DIG_RANGE = 1.6; // 持锄头可开挖熄灭火堆的距离
const DIG_HITS = 2; // 锄头挖火堆的命中次数(精致石锄 1 次)
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)
const COOK_TIME = 1.6; // 每份食物的烹饪时长(秒)
const COOK_TICK = 0.8; // 烹饪翻动特效间隔(秒)

/** 火堆旁的状态快照(HUD 用) */
export type CampfireInfo = {
  /** 是否在燃烧(只有燃着才能烹饪) */
  lit: boolean;
  /** 剩余燃烧秒数 */
  fuel: number;
};

/** 每玩家的搭建/烹饪/挖掘进度(火堆本身是世界共享的) */
type PlayerSessionState = {
  timer: number;
  tickTimer: number;
  swingTimer: number;
  hits: number;
  digTarget: Campfire | null;
  // 批量烹饪:食材先收走,逐份烤熟入包;走开或火灭则退回剩余食材
  cookKind: ResourceKind | null;
  cookFire: Campfire | null;
  cookQueue: number;
  cookTotal: number;
  cookTimer: number;
  cookTickTimer: number;
};

/**
 * 火堆系统(世界单实例,按发起者 actor 结算):材料满足且位置可摆放时通过卡片
 * 发起搭建,站定敲打完成后在玩家原位放置火堆并引燃;火堆持续燃烧消耗燃料,
 * 可反复添柴续命(无上限),燃尽后熄灭留在原地(不能再烹饪,添柴可复燃),
 * 手持锄头可把熄灭的火堆整座挖掉(直接消失)。烹饪在燃烧的火堆上批量进行,
 * 一次烤完背包里同种食材,主角在火堆旁翻炒,走开或熄火则退回剩余食材。
 */
export class CampfireSystem {
  private fires: Campfire[] = [];
  private scratch = new THREE.Vector3();
  private states = new Map<PlayerSession, PlayerSessionState>();
  private ids = new WorldEntityIds<Campfire>('fire');
  private onChanged?: EntityChangeSink;

  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isOtherBusy: (actor: PlayerSession) => boolean = () => false,
    /** 烹饪产物入包(背包放不下的部分由该函数负责掉到地上) */
    private give: (kind: ResourceKind, count: number, actor: PlayerSession) => number
  ) {}

  private st(actor: PlayerSession): PlayerSessionState {
    let st = this.states.get(actor);
    if (!st) {
      st = {
        timer: 0, tickTimer: 0, swingTimer: 0, hits: 0, digTarget: null,
        cookKind: null, cookFire: null, cookQueue: 0, cookTotal: 0, cookTimer: 0, cookTickTimer: 0,
      };
      this.states.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人进度(烹饪中的剩余食材不退,由外层结算规则决定) */
  detach(actor: PlayerSession): void {
    this.states.delete(actor);
  }

  /** 是否正在搭建火堆(站定敲打阶段) */
  isWorking(actor: PlayerSession): boolean {
    return (this.states.get(actor)?.timer ?? 0) > 0;
  }

  /** 是否正在烹饪 */
  isCooking(actor: PlayerSession): boolean {
    return (this.states.get(actor)?.cookKind ?? null) !== null;
  }

  /** 搭建、烹饪或挖掘中(占用双手) */
  isBusy(actor: PlayerSession): boolean {
    return this.isWorking(actor) || this.isCooking(actor) || this.isDigging(actor);
  }

  /** 正在挖火堆 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.states.get(actor)?.digTarget;
  }

  /** 场上所有火堆落点(小地图标记用) */
  get positions(): { x: number; z: number }[] {
    return this.fires.map((f) => ({ x: f.group.position.x, z: f.group.position.z }));
  }

  /** 玩家身旁最近的火堆(范围内的),无则 null */
  nearby(actor: PlayerSession): Campfire | null {
    let best: Campfire | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const fire of this.fires) {
      this.scratch.copy(fire.group.position);
      this.scratch.y = actor.player.group.position.y;
      const d = this.scratch.distanceToSquared(actor.player.group.position);
      if (d < bestDist) {
        best = fire;
        bestDist = d;
      }
    }
    return best;
  }

  /** 火堆旁的状态快照(不在火堆旁时为 null) */
  getCampfireInfo(actor: PlayerSession): CampfireInfo | null {
    const fire = this.nearby(actor);
    if (!fire) return null;
    return { lit: fire.isLit, fuel: fire.fuel };
  }

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点占住) */
  private canPlace(actor: PlayerSession): boolean {
    const p = actor.player.group.position;
    if (actor.player.isSwimming) return false;
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= 0) return false;
    return !this.props.list.some((prop) => {
      this.scratch.copy(prop.position);
      return this.scratch.distanceTo(p) < PROP_BLOCK_RANGE;
    });
  }

  /** 是否满足制作条件(不忙 + 材料齐 + 位置可摆放),火堆数量不限 */
  canBuild(actor: PlayerSession): boolean {
    if (this.isBusy(actor)) return false;
    if (actor.inventory.count('flint') < CAMPFIRE_COST.flint) return false;
    if (actor.inventory.count('log') < CAMPFIRE_COST.log) return false;
    return this.canPlace(actor);
  }

  /** 场景手搓卡片的弹出条件:可制作且场上还没有火堆(避免已造后反复弹卡) */
  canStart(actor: PlayerSession): boolean {
    return this.canBuild(actor) && this.fires.length === 0;
  }

  start(actor: PlayerSession): boolean {
    if (!this.canBuild(actor)) return false;
    const st = this.st(actor);
    st.timer = 0.001;
    st.tickTimer = 0;
    return true;
  }

  /** 世界侧每帧更新:火堆燃烧;各玩家的搭建/挖掘/烹饪由 updateActor 推进 */
  update(delta: number, elapsed: number): void {
    for (const fire of this.fires) {
      const wasLit = fire.isLit;
      fire.update(delta, elapsed);
      if (wasLit && !fire.isLit) this.onChanged?.({ op: 'set', id: this.ids.get(fire), fields: { fuel: 0 } });
    }
  }

  /** 每帧推进该玩家的搭建/挖掘/烹饪 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    this.updateDig(actor, st, delta);
    if (st.timer > 0) return this.updateBuild(actor, st, delta);
    this.updateCooking(actor, st, delta);
  }

  private updateBuild(actor: PlayerSession, st: PlayerSessionState, delta: number): void {
    if (actor.player.isMoving || actor.player.isSwimming) {
      st.timer = 0;
      return;
    }
    actor.player.setAction('craft');
    st.timer += delta;
    st.tickTimer += delta;
    if (st.tickTimer >= CRAFT_TICK) {
      st.tickTimer -= CRAFT_TICK;
      this.audio.play('knock');
      const p = actor.player.group.position.clone();
      p.y += 0.6;
      this.fx.burst(p, FX_COLOR, 5);
    }
    if (st.timer >= CRAFT_TIME) {
      st.timer = 0;
      actor.inventory.remove('flint', CAMPFIRE_COST.flint);
      actor.inventory.remove('log', CAMPFIRE_COST.log);
      const fire = new Campfire(this.scene, actor.player.group.position.clone(), INITIAL_FUEL);
      this.fires.push(fire);
      const firePos = fire.group.position;
      this.onChanged?.({ op: 'add', id: this.ids.get(fire), value: { id: this.ids.get(fire), x: firePos.x, y: firePos.y, z: firePos.z, fuel: fire.fuel } });
      this.audio.play('success');
      const p = actor.player.group.position.clone();
      p.y += 0.8;
      this.fx.burst(p, FX_COLOR, 14);
    }
  }

  /** 当前搭建/烹饪进度 0-1(烹饪为单份进度),空闲时为 null */
  getProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st) return null;
    if (st.cookKind) return Math.min(st.cookTimer / COOK_TIME, 1);
    return st.timer > 0 ? Math.min(st.timer / CRAFT_TIME, 1) : null;
  }

  /** 向身旁火堆添加 1 个可燃物(树枝/木头等),熄灭的火堆添柴后复燃,返回增加的燃烧秒数,失败为 0 */
  addFuel(actor: PlayerSession, kind: ResourceKind): number {
    const fire = this.nearby(actor);
    const burnTime = ITEMS[kind].burnTime;
    if (!fire || !burnTime || !actor.inventory.remove(kind, 1)) return 0;
    const wasLit = fire.isLit;
    fire.fuel += burnTime;
    if (!wasLit) fire.relight();
    this.onChanged?.({ op: 'set', id: this.ids.get(fire), fields: { fuel: fire.fuel } });
    this.audio.play('stoke');
    const p = fire.group.position.clone();
    p.y += 0.5;
    this.fx.burst(p, '#ff9a3d', 6);
    return burnTime;
  }

  /** 在身旁燃烧的火堆上发起烹饪:烤指定份数(同工作台可选个数),走开或火灭则退回剩余食材 */
  startCooking(actor: PlayerSession, kind: ResourceKind, count: number): boolean {
    if (this.isBusy(actor) || count < 1) return false;
    const st = this.st(actor);
    const fire = this.nearby(actor);
    const cooked = COOKABLE[kind];
    const owned = actor.inventory.count(kind);
    if (!fire || !fire.isLit || !cooked || owned < 1) return false;
    const n = Math.min(count, owned);
    actor.inventory.remove(kind, n);
    st.cookKind = kind;
    st.cookFire = fire;
    st.cookQueue = n;
    st.cookTotal = n;
    st.cookTimer = 0;
    st.cookTickTimer = 0;
    return true;
  }

  private updateCooking(actor: PlayerSession, st: PlayerSessionState, delta: number): void {
    const kind = st.cookKind;
    const fire = st.cookFire;
    if (!kind || !fire) return;
    const fireGone = !fire.isLit || this.nearby(actor) !== fire;
    if (actor.player.isMoving || actor.player.isSwimming || fireGone) {
      // 中断:剩余食材原样退回
      actor.inventory.add(kind, st.cookQueue);
      st.cookKind = null;
      st.cookFire = null;
      return;
    }
    actor.player.setAction('cook');
    st.cookTimer += delta;
    st.cookTickTimer += delta;
    if (st.cookTickTimer >= COOK_TICK) {
      st.cookTickTimer -= COOK_TICK;
      this.audio.play('sizzle');
      const p = fire.group.position.clone();
      p.y += 0.55;
      this.fx.burst(p, '#ffb84d', 3);
    }
    if (st.cookTimer >= COOK_TIME) {
      this.give(COOKABLE[kind]!, 1, actor);
      this.audio.play('pickup');
      st.cookTimer = 0;
      st.cookTickTimer = 0;
      st.cookQueue -= 1;
      if (st.cookQueue <= 0) {
        st.cookKind = null;
        st.cookFire = null;
        this.audio.play('success');
        const p = fire.group.position.clone();
        p.y += 0.6;
        this.fx.burst(p, '#ffcf5e', 10);
      }
    }
  }

  /** 烹饪排队总数与当前第几份(未在烹饪时均为 0) */
  cookInfo(actor: PlayerSession): { total: number; current: number } {
    const st = this.states.get(actor);
    return {
      total: st?.cookTotal ?? 0,
      current: st?.cookKind ? st.cookTotal - st.cookQueue + 1 : 0,
    };
  }

  /** 正在烹饪的食材名(未在烹饪时为 null) */
  cookingKind(actor: PlayerSession): ResourceKind | null {
    return this.states.get(actor)?.cookKind ?? null;
  }

  /** 时间快进(睡觉跳到第二天):火堆按跳过的秒数继续烧,烧完的熄灭留场 */
  passTime(seconds: number, elapsed: number): void {
    for (const fire of this.fires) {
      const wasLit = fire.isLit;
      fire.update(seconds, elapsed);
      if (wasLit && !fire.isLit) this.onChanged?.({ op: 'set', id: this.ids.get(fire), fields: { fuel: 0 } });
    }
  }

  /** 手持锄头站定在熄灭的火堆旁自动挖掘,命中数次后整座挖掉(直接消失,无返还) */
  private updateDig(actor: PlayerSession, st: PlayerSessionState, delta: number): void {
    const p = actor.player.group.position;
    let target: Campfire | null = null;
    if (
      actor.player.currentTool === 'hoe' &&
      !actor.player.isSwimming &&
      st.timer <= 0 &&
      !st.cookKind &&
      !this.isOtherBusy(actor)
    ) {
      for (const fire of this.fires) {
        if (fire.isLit) continue;
        this.scratch.copy(fire.group.position);
        this.scratch.y = p.y;
        if (this.scratch.distanceTo(p) < DIG_RANGE) {
          target = fire;
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
    actor.player.setAction('mine');
    st.swingTimer += delta;
    if (st.swingTimer < SWING_TIME) return;
    st.swingTimer = 0;
    this.fx.burst(target.group.position, FX_COLOR, 6);
    st.hits += 1;
    if (st.hits < (actor.tools.hoe >= 2 ? 1 : DIG_HITS)) return;
    st.hits = 0;
    st.digTarget = null;
    this.fires.splice(this.fires.indexOf(target), 1);
    this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
    this.scene.remove(target.group);
    target.dispose();
    this.audio.play('pickup');
    this.fx.burst(target.group.position, FX_COLOR, 14);
  }

  /** 当前挖火堆进度 0-1,未在挖掘时为 null */
  getDigProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st?.digTarget) return null;
    const need = actor.tools.hoe >= 2 ? 1 : DIG_HITS;
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  /** 当前所有火堆的存档快照(熄灭的也保存,燃料 0) */
  snapshot(): { id: string; x: number; y: number; z: number; fuel: number }[] {
    return this.fires.map((fire) => {
      const p = fire.group.position;
      return { id: this.ids.get(fire), x: p.x, y: p.y, z: p.z, fuel: fire.fuel };
    });
  }

  /** 清空场上全部火堆(客人侧重放世界快照前调用) */
  clear(): void {
    for (const fire of this.fires) {
      this.scene.remove(fire.group);
      fire.dispose();
    }
    this.fires = [];
  }

  /**
   * 客人端应用火堆快照:火堆集合没变时只原地同步燃料(燃料每秒递减,
   * 若随之重建模型会造成持续的 GPU 资源销毁/重建,足以触发移动端 WebGL 上下文丢失),
   * 有增删(新搭/挖掉)才整体重放。
   */
  netApply(list: { id?: string; x: number; y: number; z: number; fuel: number }[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.fires.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.fires[i]))) continue;
      this.scene.remove(this.fires[i].group);
      this.fires[i].dispose();
      this.fires.splice(i, 1);
    }
    const current = new Map(this.fires.map((fire) => [this.ids.get(fire), fire]));
    for (const value of list) {
      let fire = value.id ? current.get(value.id) : undefined;
      if (!fire) {
        fire = new Campfire(this.scene, new THREE.Vector3(value.x, value.y, value.z), value.fuel);
        this.ids.set(fire, value.id);
        this.fires.push(fire);
      } else fire.netApplyFuel(value.fuel);
    }
  }

  /** 从存档恢复火堆(含熄灭的) */
  restore(list: { id?: string; x: number; y: number; z: number; fuel: number }[]): void {
    for (const f of list) {
      const fire = new Campfire(this.scene, new THREE.Vector3(f.x, f.y, f.z), f.fuel);
      this.ids.set(fire, f.id);
      this.fires.push(fire);
    }
  }
}
