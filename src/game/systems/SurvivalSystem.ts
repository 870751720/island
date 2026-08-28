import type { Updatable } from '../core/GameLoop';

export type SurvivalState = {
  hunger: number; // 0-100
  thirst: number; // 0-100
  health: number; // 0-100
  stamina: number; // 0-100,游泳消耗,陆上恢复
  dead: boolean;
};

import type { Food } from './Food';

const HUNGER_RATE = 0.8; // 每秒下降
const THIRST_RATE = 1.2;
const THIRST_PER_ROUND = 40;
const STARVE_DAMAGE = 2;
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

  constructor() {
    this.state = { hunger: 100, thirst: 100, health: 100, stamina: 100, dead: false };
  }

  update(delta: number): void {
    const s = this.state;
    if (s.dead) return;
    s.hunger = Math.max(0, s.hunger - HUNGER_RATE * this.drainMultiplier * delta);
    s.thirst = Math.max(
      0,
      s.thirst - THIRST_RATE * this.drainMultiplier * this.thirstDrainMultiplier * delta
    );
    if (s.hunger <= 0 || s.thirst <= 0) {
      s.health = Math.max(0, s.health - STARVE_DAMAGE * delta);
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
    if (s.health <= 0) s.dead = true;
  }

  eat(food: Food): void {
    this.state.hunger = Math.min(100, this.state.hunger + food.hunger);
    this.state.thirst = Math.min(100, this.state.thirst + food.thirst);
  }

  drink(): void {
    this.state.thirst = Math.min(100, this.state.thirst + THIRST_PER_ROUND);
  }
}
