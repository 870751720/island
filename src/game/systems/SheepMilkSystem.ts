import type { Player } from '../entities/Player';
import type { Wildlife } from '../entities/Wildlife';
import type { GameAudio } from '../audio/GameAudio';

const MILK_RANGE = 2.2;
const MILK_TIME = 0.6; // 一次挤奶动作时长(秒)

/** 空手走近有奶的拴养绵羊自动挤奶:站定播放采集动作,进度满结算入包(移动即中断) */
export class SheepMilkSystem {
  private timer = 0;
  private workingNow = false;
  private targetId = 0;

  constructor(
    private player: Player,
    private wildlife: Wildlife,
    private audio: GameAudio,
    /** 其他占用双手的行为为真时让位 */
    private isBusy: () => boolean = () => false,
    /** 一次挤奶完成:交回游戏侧结算(客人端上行房主权威结算) */
    private onComplete: (sheepId: number, x: number, z: number) => void
  ) {}

  update(delta: number): void {
    const sheep = this.wildlife.milkableNear(this.player.group.position, MILK_RANGE);
    const working =
      !!sheep &&
      this.player.currentTool === 'hand' &&
      !this.player.isMoving &&
      !this.isBusy();
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
    this.onComplete(this.targetId, sheep!.x, sheep!.z);
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
