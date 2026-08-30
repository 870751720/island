import * as THREE from 'three';
import type { Player } from '../entities/Player';
import { Campfire } from '../entities/Campfire';
import type { ResourceKind, Inventory } from './Inventory';
import { ITEMS } from './Items';
import { COOKABLE } from './Food';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { Tools } from './Crafting';

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

/**
 * 火堆系统:材料满足且位置可摆放时通过卡片发起搭建,站定敲打完成后
 * 在玩家原位放置火堆并引燃;火堆持续燃烧消耗燃料,可反复添柴续命(无上限),
 * 燃尽后熄灭留在原地(不能再烹饪,添柴可复燃),手持锄头可把熄灭的火堆
 * 整座挖掉(直接消失)。烹饪在燃烧的火堆上批量进行,一次烤完背包里同种
 * 食材,主角在火堆旁翻炒,走开或熄火则退回剩余食材。
 */
export class CampfireSystem {
  private timer = 0;
  private tickTimer = 0;
  private fires: Campfire[] = [];
  private scratch = new THREE.Vector3();
  private swingTimer = 0;
  private hits = 0;
  private digTarget: Campfire | null = null;
  // 批量烹饪:食材先收走,逐份烤熟入包;走开或火灭则退回剩余食材
  private cookKind: ResourceKind | null = null;
  private cookFire: Campfire | null = null;
  private cookQueue = 0;
  private cookTotal = 0;
  private cookTimer = 0;
  private cookTickTimer = 0;

  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private inventory: Inventory,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    private tools: Tools,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isOtherBusy: () => boolean = () => false,
    /** 烹饪产物入包(背包放不下的部分由该函数负责掉到地上) */
    private give: (kind: ResourceKind, count: number) => number = (k, n) => inventory.add(k, n)
  ) {}

  /** 是否正在搭建火堆(站定敲打阶段) */
  get isWorking(): boolean {
    return this.timer > 0;
  }

  /** 是否正在烹饪 */
  get isCooking(): boolean {
    return this.cookKind !== null;
  }

  /** 搭建、烹饪或挖掘中(占用双手) */
  get isBusy(): boolean {
    return this.isWorking || this.isCooking || this.isDigging;
  }

  /** 正在挖火堆 */
  get isDigging(): boolean {
    return !!this.digTarget;
  }

  /** 场上所有火堆落点(小地图标记用) */
  get positions(): { x: number; z: number }[] {
    return this.fires.map((f) => ({ x: f.group.position.x, z: f.group.position.z }));
  }

  /** 玩家身旁最近的火堆(范围内的),无则 null */
  get nearby(): Campfire | null {
    let best: Campfire | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const fire of this.fires) {
      this.scratch.copy(fire.group.position);
      this.scratch.y = this.player.group.position.y;
      const d = this.scratch.distanceToSquared(this.player.group.position);
      if (d < bestDist) {
        best = fire;
        bestDist = d;
      }
    }
    return best;
  }

  /** 火堆旁的状态快照(不在火堆旁时为 null) */
  getCampfireInfo(): CampfireInfo | null {
    const fire = this.nearby;
    if (!fire) return null;
    return { lit: fire.isLit, fuel: fire.fuel };
  }

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点占住) */
  private canPlace(): boolean {
    const p = this.player.group.position;
    if (this.player.isSwimming) return false;
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= 0) return false;
    return !this.props.list.some((prop) => {
      this.scratch.copy(prop.position);
      return this.scratch.distanceTo(p) < PROP_BLOCK_RANGE;
    });
  }

  /** 是否满足发起条件(材料齐 + 位置可摆放 + 全场没有火堆) */
  canStart(): boolean {
    if (this.isBusy) return false;
    // 已有火堆(燃着或熄灭)时不再弹搭建卡片,想换位置先挖掉旧火堆
    if (this.fires.length > 0) return false;
    if (this.inventory.count('flint') < CAMPFIRE_COST.flint) return false;
    if (this.inventory.count('log') < CAMPFIRE_COST.log) return false;
    return this.canPlace();
  }

  start(): boolean {
    if (!this.canStart()) return false;
    this.timer = 0.001;
    this.tickTimer = 0;
    return true;
  }

  update(delta: number, elapsed: number): void {
    for (const fire of this.fires) fire.update(delta, elapsed);
    this.updateDig(delta);
    if (!this.isWorking) return this.updateCooking(delta);
    if (this.player.isMoving || this.player.isSwimming) {
      this.timer = 0;
      return;
    }
    this.player.setAction('craft');
    this.timer += delta;
    this.tickTimer += delta;
    if (this.tickTimer >= CRAFT_TICK) {
      this.tickTimer -= CRAFT_TICK;
      this.audio.play('knock');
      const p = this.player.group.position.clone();
      p.y += 0.6;
      this.fx.burst(p, FX_COLOR, 5);
    }
    if (this.timer >= CRAFT_TIME) {
      this.timer = 0;
      this.inventory.remove('flint', CAMPFIRE_COST.flint);
      this.inventory.remove('log', CAMPFIRE_COST.log);
      this.fires.push(
        new Campfire(this.scene, this.player.group.position.clone(), INITIAL_FUEL)
      );
      this.audio.play('success');
      const p = this.player.group.position.clone();
      p.y += 0.8;
      this.fx.burst(p, FX_COLOR, 14);
    }
  }

  /** 当前搭建/烹饪进度 0-1(烹饪为单份进度),空闲时为 null */
  getProgress(): number | null {
    if (this.isCooking) return Math.min(this.cookTimer / COOK_TIME, 1);
    return this.isWorking ? Math.min(this.timer / CRAFT_TIME, 1) : null;
  }

  /** 向身旁火堆添加 1 个可燃物(树枝/木头等),熄灭的火堆添柴后复燃,返回增加的燃烧秒数,失败为 0 */
  addFuel(kind: ResourceKind): number {
    const fire = this.nearby;
    const burnTime = ITEMS[kind].burnTime;
    if (!fire || !burnTime || !this.inventory.remove(kind, 1)) return 0;
    const wasLit = fire.isLit;
    fire.fuel += burnTime;
    if (!wasLit) fire.relight();
    this.audio.play('stoke');
    const p = fire.group.position.clone();
    p.y += 0.5;
    this.fx.burst(p, '#ff9a3d', 6);
    return burnTime;
  }

  /** 在身旁燃烧的火堆上发起烹饪:烤指定份数(同工作台可选个数),走开或火灭则退回剩余食材 */
  startCooking(kind: ResourceKind, count: number): boolean {
    if (this.isBusy || count < 1) return false;
    const fire = this.nearby;
    const cooked = COOKABLE[kind];
    const owned = this.inventory.count(kind);
    if (!fire || !fire.isLit || !cooked || owned < 1) return false;
    const n = Math.min(count, owned);
    this.inventory.remove(kind, n);
    this.cookKind = kind;
    this.cookFire = fire;
    this.cookQueue = n;
    this.cookTotal = n;
    this.cookTimer = 0;
    this.cookTickTimer = 0;
    return true;
  }

  private updateCooking(delta: number): void {
    const kind = this.cookKind;
    const fire = this.cookFire;
    if (!kind || !fire) return;
    const fireGone = !fire.isLit || this.nearby !== fire;
    if (this.player.isMoving || this.player.isSwimming || fireGone) {
      // 中断:剩余食材原样退回
      this.inventory.add(kind, this.cookQueue);
      this.cookKind = null;
      this.cookFire = null;
      return;
    }
    this.player.setAction('cook');
    this.cookTimer += delta;
    this.cookTickTimer += delta;
    if (this.cookTickTimer >= COOK_TICK) {
      this.cookTickTimer -= COOK_TICK;
      this.audio.play('sizzle');
      const p = fire.group.position.clone();
      p.y += 0.55;
      this.fx.burst(p, '#ffb84d', 3);
    }
    if (this.cookTimer >= COOK_TIME) {
      this.give(COOKABLE[kind]!, 1);
      this.audio.play('pickup');
      this.cookTimer = 0;
      this.cookTickTimer = 0;
      this.cookQueue -= 1;
      if (this.cookQueue <= 0) {
        this.cookKind = null;
        this.cookFire = null;
        this.audio.play('success');
        const p = fire.group.position.clone();
        p.y += 0.6;
        this.fx.burst(p, '#ffcf5e', 10);
      }
    }
  }

  /** 烹饪排队总数与当前第几份(未在烹饪时均为 0) */
  get cookInfo(): { total: number; current: number } {
    return {
      total: this.cookTotal,
      current: this.cookKind ? this.cookTotal - this.cookQueue + 1 : 0,
    };
  }

  /** 正在烹饪的食材名(未在烹饪时为 null) */
  get cookingKind(): ResourceKind | null {
    return this.cookKind;
  }

  /** 时间快进(睡觉跳到第二天):火堆按跳过的秒数继续烧,烧完的熄灭留场 */
  passTime(seconds: number, elapsed: number): void {
    for (const fire of this.fires) fire.update(seconds, elapsed);
  }

  /** 手持锄头站定在熄灭的火堆旁自动挖掘,命中数次后整座挖掉(直接消失,无返还) */
  private updateDig(delta: number): void {
    const p = this.player.group.position;
    let target: Campfire | null = null;
    if (
      this.player.currentTool === 'hoe' &&
      !this.player.isSwimming &&
      !this.isWorking &&
      !this.isCooking &&
      !this.isOtherBusy()
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
    if (!target || this.player.isMoving) {
      this.digTarget = null;
      this.swingTimer = 0;
      this.hits = 0;
      return;
    }
    this.digTarget = target;
    this.player.setAction('mine');
    this.swingTimer += delta;
    if (this.swingTimer < SWING_TIME) return;
    this.swingTimer = 0;
    this.fx.burst(target.group.position, FX_COLOR, 6);
    this.hits += 1;
    if (this.hits < (this.tools.hoe >= 2 ? 1 : DIG_HITS)) return;
    this.hits = 0;
    this.digTarget = null;
    this.fires.splice(this.fires.indexOf(target), 1);
    this.scene.remove(target.group);
    target.dispose();
    this.audio.play('pickup');
    this.fx.burst(target.group.position, FX_COLOR, 14);
  }

  /** 当前挖火堆进度 0-1,未在挖掘时为 null */
  getDigProgress(): number | null {
    if (!this.digTarget) return null;
    const need = this.tools.hoe >= 2 ? 1 : DIG_HITS;
    return Math.min((this.hits + this.swingTimer / SWING_TIME) / need, 1);
  }

  /** 当前所有火堆的存档快照(熄灭的也保存,燃料 0) */
  snapshot(): { x: number; y: number; z: number; fuel: number }[] {
    return this.fires.map((fire) => {
      const p = fire.group.position;
      return { x: p.x, y: p.y, z: p.z, fuel: fire.fuel };
    });
  }

  /** 从存档恢复火堆(含熄灭的) */
  restore(list: { x: number; y: number; z: number; fuel: number }[]): void {
    for (const f of list) {
      this.fires.push(new Campfire(this.scene, new THREE.Vector3(f.x, f.y, f.z), f.fuel));
    }
  }
}
