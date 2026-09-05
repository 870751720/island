import type { ActionType, Player } from '../entities/Player';

/**
 * 作业动作持有器:交互进行期间每帧 `hold`,帧末统一 `commit`。
 * 交互结束(本帧未再 hold)时,只释放自己上一帧持有的那个动作,
 * 避免抹掉同帧被剑/弓等其他系统接管的动作;交互结束不清动作会让角色
 * 停下后一直卡在该动作的姿态里,因此每个持续设置动作的系统都应经由本类持有。
 */
export class ActionHold {
  private held: ActionType | null = null;
  private frame: ActionType | null = null;

  /** 作业进行中每帧调用:持有并设置动作 */
  hold(player: Player, action: ActionType): void {
    this.frame = action;
    player.setAction(action);
  }

  /** 每帧末调用:动作与本帧一致则维持,否则释放旧动作、记住新动作(可为 null) */
  commit(player: Player): void {
    if (this.frame !== this.held) {
      if (this.held) player.releaseAction(this.held);
      this.held = this.frame;
    }
    this.frame = null;
  }
}
