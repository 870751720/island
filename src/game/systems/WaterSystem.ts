import type { Player } from '../entities/Player';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { SurvivalSystem } from './SurvivalSystem';
import type { GameAudio } from '../audio/GameAudio';

const DRINK_TIME = 2; // 一轮喝水(秒)
const THIRST_PER_ROUND = 40;
/** 站在水洼浅水中自动喝水恢复口渴；海水不可饮用，游泳或有其他作业时让位。 */
export class WaterSystem {
  private timer = 0;
  private active = false;

  constructor(
    private player: Player,
    private terrain: IslandTerrain,
    private survival: SurvivalSystem,
    private audio: GameAudio,
    /** 每喝完一轮水后通知(喝水触发的特殊事件挂在房主侧,如水洼出鳄鱼) */
    private onDrinkRound: () => void = () => {}
  ) {}

  update(delta: number, harvestBusy: boolean): void {
    const p = this.player.group.position;
    const standingInPond = this.terrain.getWaterKind(p.x, p.z) === 'pond' && !this.player.isSwimming;
    const thirsty = this.survival.state.thirst < 99;
    this.active =
      standingInPond && thirsty && !this.player.isMoving && !harvestBusy;

    if (!this.active) {
      // 中途走开/口渴满等结束喝水时,释放喝水动作并切断仍在播的吞咽声
      this.player.releaseAction('drink');
      if (this.timer > 0) this.audio.stop('drink');
      this.timer = 0;
      return;
    }

    this.player.setAction('drink');
    // 每轮开始喝水就播「咕咕」声,让声音落在喝水过程中而非结束时
    if (this.timer === 0) this.audio.play('drink');
    this.timer += delta;
    if (this.timer < DRINK_TIME) return;
    this.timer = 0;
    this.survival.drink();
    this.onDrinkRound();
  }

  get isActive(): boolean {
    return this.active;
  }

  getProgress(): number | null {
    return this.active ? this.timer / DRINK_TIME : null;
  }
}
