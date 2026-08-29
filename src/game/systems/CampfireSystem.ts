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

const CRAFT_TIME = 2.4; // 搭建火堆总时长(秒)
const CRAFT_TICK = 0.6; // 每次敲击特效间隔(秒)
const FX_COLOR = '#e0862e';
const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处落脚摆放
const NEAR_RANGE = 2.2; // 玩家距火堆小于该值时算在火堆旁
export const CAMPFIRE_COST = { flint: 1, log: 2 };
const INITIAL_FUEL = 60; // 搭好时引燃的初始燃烧秒数
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
 * 燃尽后化为灰烬并倒计时消失。烹饪在燃烧的火堆上批量进行,一次烤完
 * 背包里同种食材,主角在火堆旁翻炒,走开或熄火则退回剩余食材。
 */
export class CampfireSystem {
  private timer = 0;
  private tickTimer = 0;
  private fires: Campfire[] = [];
  private scratch = new THREE.Vector3();
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
    private audio: GameAudio
  ) {}

  /** 是否正在搭建火堆(站定敲打阶段) */
  get isWorking(): boolean {
    return this.timer > 0;
  }

  /** 是否正在烹饪 */
  get isCooking(): boolean {
    return this.cookKind !== null;
  }

  /** 搭建或烹饪中(占用双手) */
  get isBusy(): boolean {
    return this.isWorking || this.isCooking;
  }

  /** 玩家身旁最近的火堆(范围内的),无则 null */
  get nearby(): Campfire | null {
    let best: Campfire | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const fire of this.fires) {
      // 灰烬无火堆逻辑:燃尽后的残堆不参与交互,等倒计时消失
      if (fire.spent || fire.ashLeft !== null) continue;
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

  /** 是否满足发起条件(材料齐 + 位置可摆放) */
  canStart(): boolean {
    if (this.isBusy) return false;
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
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const fire = this.fires[i];
      fire.update(delta, elapsed);
      if (fire.spent) {
        this.scene.remove(fire.group);
        fire.dispose();
        this.fires.splice(i, 1);
      }
    }
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

  /** 向身旁火堆添加 1 个可燃物(树枝/木头等),返回增加的燃烧秒数,失败为 0 */
  addFuel(kind: ResourceKind): number {
    const fire = this.nearby;
    const burnTime = ITEMS[kind].burnTime;
    if (!fire || !burnTime || !this.inventory.remove(kind, 1)) return 0;
    fire.fuel += burnTime;
    this.audio.play('stoke');
    const p = fire.group.position.clone();
    p.y += 0.5;
    this.fx.burst(p, '#ff9a3d', 6);
    return burnTime;
  }

  /** 在身旁燃烧的火堆上发起批量烹饪:一次烤完背包里该食材的全部数量,走开或火灭则退回剩余食材 */
  startCooking(kind: ResourceKind): boolean {
    if (this.isBusy) return false;
    const fire = this.nearby;
    const cooked = COOKABLE[kind];
    const count = this.inventory.count(kind);
    if (!fire || !fire.isLit || !cooked || count < 1) return false;
    this.inventory.remove(kind, count);
    this.cookKind = kind;
    this.cookFire = fire;
    this.cookQueue = count;
    this.cookTotal = count;
    this.cookTimer = 0;
    this.cookTickTimer = 0;
    return true;
  }

  private updateCooking(delta: number): void {
    const kind = this.cookKind;
    const fire = this.cookFire;
    if (!kind || !fire) return;
    const fireGone = fire.spent || fire.ashLeft !== null || !fire.isLit || this.nearby !== fire;
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
      const p = fire.group.position.clone();
      p.y += 0.55;
      this.fx.burst(p, '#ffb84d', 3);
    }
    if (this.cookTimer >= COOK_TIME) {
      this.inventory.add(COOKABLE[kind]!, 1);
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
}
