import { isDrinkablePond } from './WaterAccess';
import type { Player } from '../entities/Player';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { SurvivalSystem } from './SurvivalSystem';
import type { GameAudio } from '../audio/GameAudio';

const DRINK_TIME = 2; // 一轮喝水(秒)
const SIP_INTERVAL = 0.5;
/** 站在水洼浅水中自动喝水恢复口渴；海水不可饮用，游泳或有其他作业时让位。 */
export class WaterSystem {
  private timer = 0;
  private active = false;
  private sipTimer = 0;

  constructor(
    private player: Player,
    private terrain: IslandTerrain,
    private survival: SurvivalSystem,
    private audio: GameAudio,
    /** 每喝完一轮水后通知(喝水触发的特殊事件挂在房主侧,如水洼出鳄鱼) */
    private onDrinkRound: () => void = () => {}
  ) {}

  update(delta: number, harvestBusy: boolean, nearPurifier = false): void {
    const p = this.player.group.position;
    const standingInPond = isDrinkablePond(this.terrain, p.x, p.z) && !this.player.isSwimming;
    const thirsty = this.survival.state.thirst < 99;
    this.active =
      (standingInPond || nearPurifier) && thirsty && !this.player.isMoving && !harvestBusy;

    if (!this.active) {
      // 中途走开/口渴满等结束喝水时,释放喝水动作并切断仍在播的吞咽声
      this.player.releaseAction('drink');
      if (this.timer > 0) this.audio.stop('drink');
      this.timer = 0;
      this.sipTimer = 0;
      return;
    }

    this.player.setAction('drink');
    this.timer += delta;
    this.sipTimer -= delta;
    if (this.timer < DRINK_TIME) {
      if (this.sipTimer <= 0) {
        this.audio.play('drink');
        this.sipTimer = SIP_INTERVAL;
      }
      return;
    }
    this.audio.stop('drink');
    this.sipTimer = 0;
    this.timer = 0;
    this.survival.drink();
    // 水洼喝水才可能惊动鳄鱼,净化器喝的是清水
    if (standingInPond) this.onDrinkRound();
  }

  get isActive(): boolean {
    return this.active;
  }

  getProgress(): number | null {
    return this.active ? this.timer / DRINK_TIME : null;
  }
}
