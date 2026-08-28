import type { Player } from '../entities/Player';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { SurvivalSystem } from './SurvivalSystem';

const DRINK_TIME = 2; // 一轮喝水(秒)
const THIRST_PER_ROUND = 40;
const DRINK_RANGE = 1.5; // 距水边

/** 靠近水洼/河流站定自动喝水恢复口渴;有采集作业时让位 */
export class WaterSystem {
  private timer = 0;
  private active = false;

  constructor(
    private player: Player,
    private terrain: IslandTerrain,
    private survival: SurvivalSystem
  ) {}

  update(delta: number, harvestBusy: boolean): void {
    const nearWater = this.terrain.isNearWater(this.player.group.position, DRINK_RANGE);
    const thirsty = this.survival.state.thirst < 99;
    this.active =
      nearWater && thirsty && !this.player.isMoving && !harvestBusy;

    if (!this.active) {
      this.timer = 0;
      return;
    }

    this.player.setAction('drink');
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
