import type { Updatable } from '../core/GameLoop';

export type SurvivalState = {
  hunger: number; // 0-100
  thirst: number; // 0-100
  health: number; // 0-100
  stamina: number; // 0-100,游泳消耗,陆上恢复
  dead: boolean;
};

import type { Food } from './Food';
import { GmSystem } from './GmSystem';

const HUNGER_RATE = 0.8 / 3; // 每秒下降(原 0.8,放缓 3 倍)
const THIRST_RATE = 1.2 / 3; // 原速率放缓 3 倍
const THIRST_PER_ROUND = 40;
const STARVE_DAMAGE = 2;
/** 饥饿/口渴归零后的掉血每 2 秒结算一次(一次性扣一笔,避免角色持续泛红) */
const STARVE_TICK = 2;
const STAMINA_SWIM_RATE = 4; // 游泳每秒消耗
const STAMINA_RECOVER_RATE = 10; // 陆上每秒恢复
const DROWN_DAMAGE = 25; // 体力耗尽后落水每秒掉血

export class SurvivalSystem implements Updatable {
  readonly state: SurvivalState;
  /** 夜晚等环境因素对消耗速率的全局倍率 */
  drainMultiplier = 1;
  /** 天气等因素对口渴消耗的额外倍率(如雨天淋雨减缓) */
  thirstDrainMultiplier = 1;
  /** 当前是否在游泳(由游戏循环每帧同步) */
  swimming = false;
  /** 饥饿/口渴掉血的累计结算计时 */
  private starveTimer = 0;

  constructor() {
    this.state = { hunger: 100, thirst: 100, health: 100, stamina: 100, dead: false };
  }

  update(delta: number): void {
    const s = this.state;
    if (s.dead) return;
    if (GmSystem.godMode) {
      s.hunger = s.thirst = s.health = s.stamina = 100;
      return;
    }
    s.hunger = Math.max(0, s.hunger - HUNGER_RATE * this.drainMultiplier * delta);
    s.thirst = Math.max(
      0,
      s.thirst - THIRST_RATE * this.drainMultiplier * this.thirstDrainMultiplier * delta
    );
    if (s.hunger <= 0 || s.thirst <= 0) {
      // 每 2 秒结算一笔累计掉血,吃/喝回补后未结算的部分不再扣
      this.starveTimer += delta;
      if (this.starveTimer >= STARVE_TICK) {
        s.health = Math.max(0, s.health - STARVE_DAMAGE * this.starveTimer);
        this.starveTimer = 0;
      }
    } else {
      this.starveTimer = 0;
    }
    if (this.swimming) {
      s.stamina = Math.max(0, s.stamina - STAMINA_SWIM_RATE * delta);
      // 体力耗尽仍泡在水里:呛水持续掉血直至溺亡
      if (s.stamina <= 0) {
        s.health = Math.max(0, s.health - DROWN_DAMAGE * delta);
      }
    } else {
      s.stamina = Math.min(100, s.stamina + STAMINA_RECOVER_RATE * delta);
    }
    if (s.health <= 0) {
      if (GmSystem.allowDeath) {
        s.dead = true;
      } else {
        s.health = 1;
      }
    }
  }

  eat(food: Food): void {
    this.state.hunger = Math.min(100, this.state.hunger + food.hunger);
    this.state.thirst = Math.min(100, this.state.thirst + food.thirst);
    this.state.health = Math.min(100, this.state.health + food.health);
  }

  drink(): void {
    this.state.thirst = Math.min(100, this.state.thirst + THIRST_PER_ROUND);
  }

  /** 受到外力伤害(如野兽扑击),死亡判定交给 update 统一处理 */
  damage(amount: number): void {
    if (this.state.dead) return;
    this.state.health = Math.max(0, this.state.health - amount);
  }
}
