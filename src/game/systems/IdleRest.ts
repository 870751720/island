import { Vector2 } from 'three';
import type { PlayerSession } from '../mp/PlayerSession';

/** 单机闲置暂停：直接读取输入，避免等待暂停中的角色更新才能恢复。 */
export class IdleRest {
  private movement = new Vector2();

  shouldPause(session: PlayerSession, enabled: boolean, active: boolean, delay: number): boolean {
    return enabled && !session.survival.state.dead && !active
      && session.hudIdleTime >= delay
      && session.player.input.getVector(this.movement).lengthSq() <= 0.001;
  }
}
