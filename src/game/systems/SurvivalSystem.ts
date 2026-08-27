import type { Updatable } from '../core/GameLoop';

export type SurvivalState = {
  hunger: number; // 0-100
  thirst: number; // 0-100
  health: number; // 0-100
  dead: boolean;
};

const HUNGER_RATE = 0.8; // 每秒下降
const THIRST_RATE = 1.2;
const STARVE_DAMAGE = 2;

export class SurvivalSystem implements Updatable {
  readonly state: SurvivalState;

  constructor() {
    this.state = { hunger: 100, thirst: 100, health: 100, dead: false };
  }

  update(delta: number): void {
    const s = this.state;
    if (s.dead) return;
    s.hunger = Math.max(0, s.hunger - HUNGER_RATE * delta);
    s.thirst = Math.max(0, s.thirst - THIRST_RATE * delta);
    if (s.hunger <= 0 || s.thirst <= 0) {
      s.health = Math.max(0, s.health - STARVE_DAMAGE * delta);
      if (s.health <= 0) s.dead = true;
    }
  }

  eatBerry(): void {
    this.state.hunger = Math.min(100, this.state.hunger + 12);
    this.state.thirst = Math.min(100, this.state.thirst + 4);
  }
}
