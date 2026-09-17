import type { Player } from '../entities/Player';
import type { Wildlife } from '../entities/Wildlife';
import type { GameAudio } from '../audio/GameAudio';

const MILK_RANGE = 2.2;
const MILK_TIME = 0.6; // 一次挤奶动作时长(秒)

/** 成年驯养牲畜的挤奶与剪毛；手持剪刀时只处理剪毛。 */
export class LivestockHarvestSystem {
  private timer = 0;
  private workingNow = false;
  private targetId = 0;
  private wool = false;
  label = '挤奶…';

  constructor(
    private player: Player,
    private wildlife: Wildlife,
    private audio: GameAudio,
    /** 其他占用双手的行为为真时让位 */
    private isBusy: () => boolean = () => false,
    /** 一次挤奶完成:交回游戏侧结算(客人端上行房主权威结算) */
    private onComplete: (animalId: number, wool: boolean) => void
  ) {}

  update(delta: number): void {
    const wool = this.player.currentTool === 'shears';
    const sheep = this.wildlife.harvestableNear(this.player.group.position, MILK_RANGE, wool);
    if (sheep?.id !== this.targetId || wool !== this.wool) this.timer = 0;
    this.wool = wool;
    this.label = wool ? '剪羊毛…' : sheep?.kind === 'cowMilk' ? '挤牛奶…' : '挤羊奶…';
    // 与采浆果一致:不需要特定工具,站定即可(移动或双手被占用时中断)
    const working = !!sheep && !this.player.isMoving && !this.player.isSwimming && !this.isBusy();
    const wasWorking = this.workingNow;
    this.workingNow = working;
    if (working) {
      this.targetId = sheep!.id;
      this.player.setAction('pick');
    } else if (wasWorking) {
      this.player.releaseAction('pick');
    }
    if (!working) {
      this.timer = 0;
      return;
    }
    if (this.timer === 0) this.audio.play('pick');
    this.timer += delta;
    if (this.timer < MILK_TIME) return;
    this.timer = 0;
    this.onComplete(this.targetId, wool);
  }

  /** 是否正在挤奶(进度指示与其他系统让位判定用) */
  get isWorking(): boolean {
    return this.workingNow;
  }

  /** 本次挤奶进度 0-1,未在挤奶时为 null */
  getProgress(): number | null {
    return this.workingNow ? Math.min(this.timer / MILK_TIME, 1) : null;
  }
}
