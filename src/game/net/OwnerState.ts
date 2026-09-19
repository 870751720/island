import type { ActionType } from '../entities/Player';

/** 本人提交的是已经完成本地碰撞的姿态；epoch 隔离复活前的在途消息。 */
export interface OwnerPose {
  seq: number;
  epoch: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  moving: boolean;
  action: ActionType | null;
}

const actions = new Set(['chop', 'mine', 'pick', 'drink', 'craft', 'cook', 'eat_berry', 'eat_fish', 'cast', 'fish', 'shoot', 'slash', 'sleep']);
export function validOwnerPose(value: unknown): value is OwnerPose {
  if (!value || typeof value !== 'object') return false;
  const p = value as OwnerPose;
  return Number.isSafeInteger(p.seq) && p.seq > 0 && Number.isSafeInteger(p.epoch) && p.epoch >= 0
    && [p.x, p.y, p.z, p.rotY].every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 100000)
    && typeof p.moving === 'boolean' && (p.action === null || actions.has(p.action));
}

/** 可靠动作的序号独立于姿态；重复消息不能重复发物或扣料。 */
export class OwnerActionWindow {
  private latest = 0;
  accept(seq: number): boolean {
    if (!Number.isSafeInteger(seq) || seq <= this.latest) return false;
    this.latest = seq;
    return true;
  }
}
