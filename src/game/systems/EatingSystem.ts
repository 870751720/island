import type { Player } from '../entities/Player';
import { foodAction, foodSound, type Food } from './Food';
import type { Inventory } from './Inventory';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { SurvivalSystem } from './SurvivalSystem';
import { EAT_TIME } from './EatingTiming';

const EAT_TICK = 0.5; // 进食特效间隔(秒)

/** 定时进食:播放该食物的进食动画与特效,进度走头顶交互圆环;移动/游泳中断,完成才消耗并恢复数值 */
export class EatingSystem {
  private food: Food | null = null;
  private timer = 0;
  private tickTimer = 0;
  private finishScheduled = false;
  /** 「吃饱」模式:吃完一份后饥饿未满且还有存货则自动继续 */
  private untilFull = false;

  constructor(
    private player: Player,
    private inventory: Inventory,
    private survival: SurvivalSystem,
    private fx: Particles,
    private audio: GameAudio,
    /** 一份食物吃完的回调(消耗与恢复数值之外的效果,如喝酒的限时增益) */
    private onEaten?: (food: Food) => void
  ) {}

  start(food: Food): boolean {
    if (this.food || this.inventory.count(food.kind) <= 0) return false;
    this.food = food;
    this.timer = 0;
    this.tickTimer = 0;
    this.finishScheduled = false;
    this.untilFull = false;
    return true;
  }

  /** 连续吃同一食物直到饥饿满或吃完(吃饱按钮) */
  startFull(food: Food): boolean {
    if (!this.start(food)) return false;
    this.untilFull = true;
    return true;
  }

  update(delta: number): void {
    const food = this.food;
    if (!food) return;
    if (this.player.isMoving || this.player.isSwimming) {
      // 中断时切断该食物的使用音效
      this.audio.stop(foodSound(food));
      if (!this.audio.silent) this.audio.stop('eatFinish');
      this.food = null;
      this.untilFull = false;
      this.player.releaseAction(foodAction(food));
      return;
    }
    this.player.setAction(foodAction(food));
    this.timer += delta;
    this.tickTimer += delta;
    const remaining = EAT_TIME - this.timer;
    const swallowing = food.consumeType === 'eat' && remaining <= this.audio.eatFinishDuration;
    if (food.consumeType === 'eat' && !this.finishScheduled && remaining > 0) {
      this.finishScheduled = this.audio.scheduleEatFinish(remaining);
    }
    if (swallowing && !this.audio.silent) this.audio.stop('munch');
    if (this.tickTimer >= EAT_TICK && this.timer < EAT_TIME) {
      this.tickTimer -= EAT_TICK;
      if (!swallowing) this.audio.play(foodSound(food));
      // 嘴边掉渣特效
      const p = this.player.group.position.clone();
      p.y += 2;
      if (food.consumeType === 'eat') this.fx.burst(p, food.fxColor, 3);
    }
    if (this.timer >= EAT_TIME) {
      this.audio.stop(foodSound(food));
      this.player.releaseAction(foodAction(food));
      if (this.inventory.remove(food.kind)) {
        this.survival.eat(food);
        this.onEaten?.(food);
      }
      if (this.untilFull && this.survival.state.hunger < 100 && this.inventory.count(food.kind) > 0) {
        this.timer = 0;
        this.tickTimer = 0;
        this.finishScheduled = false;
        return;
      }
      this.food = null;
      this.untilFull = false;
    }
  }

  get isWorking(): boolean {
    return !!this.food;
  }

  /** 当前进食进度 0-1,未在进食时为 null */
  getProgress(): number | null {
    return this.food ? Math.min(this.timer / EAT_TIME, 1) : null;
  }

  get currentFood(): Food | null {
    return this.food;
  }
}
