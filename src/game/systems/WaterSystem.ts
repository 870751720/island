import type { Player } from '../entities/Player';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { SurvivalSystem } from './SurvivalSystem';
import type { GameAudio } from '../audio/GameAudio';

const DRINK_TIME = 2; // 一轮喝水(秒)
const THIRST_PER_ROUND = 40;
const DRINK_RANGE = 1; // 距水边

/** 靠近水洼岸边站定自动喝水恢复口渴;站在水里或有采集作业时让位 */
export class WaterSystem {
  private timer = 0;
  private active = false;

  constructor(
    private player: Player,
    private terrain: IslandTerrain,
    private survival: SurvivalSystem,
    private audio: GameAudio
  ) {}

  update(delta: number, harvestBusy: boolean): void {
    const nearWater =
      this.terrain.isNearWater(this.player.group.position, DRINK_RANGE) &&
      !this.terrain.isInWater(this.player.group.position);
    const thirsty = this.survival.state.thirst < 99;
    this.active =
      nearWater && thirsty && !this.player.isMoving && !harvestBusy;

    if (!this.active) {
      // 中途走开等取消喝水时,切断仍在播的吞咽声
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
  }

  get isActive(): boolean {
    return this.active;
  }

  getProgress(): number | null {
    return this.active ? this.timer / DRINK_TIME : null;
  }
}
