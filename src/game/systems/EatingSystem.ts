import type { Player } from '../entities/Player';
import type { Food } from './Food';
import type { Inventory } from './Inventory';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { SurvivalSystem } from './SurvivalSystem';

const EAT_TIME = 1.5; // 进食总时长(秒)
const EAT_TICK = 0.5; // 进食特效间隔(秒)

/** 定时进食:播放该食物的进食动画与特效,进度走头顶交互圆环;移动/游泳中断,完成才消耗并恢复数值 */
export class EatingSystem {
  private food: Food | null = null;
  private timer = 0;
  private tickTimer = 0;

  constructor(
    private player: Player,
    private inventory: Inventory,
    private survival: SurvivalSystem,
    private fx: Particles,
    private audio: GameAudio
  ) {}

  start(food: Food): boolean {
    if (this.food || this.inventory.count(food.kind) <= 0) return false;
    this.food = food;
    this.timer = 0;
    this.tickTimer = 0;
    return true;
  }

  update(delta: number): void {
    const food = this.food;
    if (!food) return;
    if (this.player.isMoving || this.player.isSwimming) {
      // 中断进食时切断仍在播的咀嚼声
      this.audio.stop('munch');
      this.food = null;
      return;
    }
    this.player.setAction(food.action);
    this.timer += delta;
    this.tickTimer += delta;
    if (this.tickTimer >= EAT_TICK) {
      this.tickTimer -= EAT_TICK;
      this.audio.play('munch');
      // 嘴边掉渣特效
      const p = this.player.group.position.clone();
      p.y += 2;
      this.fx.burst(p, food.fxColor, 3);
    }
    if (this.timer >= EAT_TIME) {
      this.food = null;
      if (this.inventory.remove(food.kind)) {
        this.survival.eat(food);
      }
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
