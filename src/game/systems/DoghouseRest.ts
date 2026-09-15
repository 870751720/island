import type { Vector3 } from 'three';
import type { Doghouse } from '../entities/Doghouse';

export const DOGHOUSE_NEAR_RANGE = 4;
export const DOGHOUSE_SLEEP_XP = 5;
const REWARD_COOLDOWN = 120;
const distance = (a: Vector3, b: Vector3) => Math.hypot(a.x - b.x, a.z - b.z);

/** 一次睡眠的目标与抵达状态；寻路时间不算睡眠，中断不发奖励。 */
export class DoghouseRest {
  find: (player: Vector3) => Doghouse | null = () => null;
  private target: Doghouse | null = null;
  private waypoint: 'entrance' | 'bed' | null = null;
  private travelLeft = 0;
  rewardCooldown = 0;

  get traveling(): boolean { return this.waypoint !== null; }
  get resting(): boolean { return !!this.target && !this.traveling; }
  get bed(): Vector3 | null { return this.resting ? this.target!.bed : null; }
  get heading(): number { return Math.PI / 2 - (this.target?.group.rotation.y ?? 0); }

  begin(player: Vector3): void {
    this.cancel();
    this.target = this.find(player);
    if (this.target) { this.waypoint = 'entrance'; this.travelLeft = 12; }
  }
  cancel(): void { this.target = null; this.waypoint = null; }
  /** 狗窝被回收或跟随玩家离开附近时，取消整次睡眠。 */
  update(delta: number, player: Vector3): boolean {
    this.rewardCooldown = Math.max(0, this.rewardCooldown - delta);
    if (this.target && (!this.target.group.parent || distance(player, this.target.group.position) > DOGHOUSE_NEAR_RANGE)) {
      this.cancel(); return false;
    }
    return true;
  }
  travel(delta: number, position: Vector3, step: (at: Vector3) => boolean): boolean {
    if (!this.target || !this.waypoint) return false;
    this.travelLeft -= delta;
    if (this.travelLeft <= 0) { this.cancel(); return false; }
    const goal = this.target[this.waypoint];
    // 与伴侣移动的 0.15 米停止距离兼容，避免已经站定却迟迟无法抵达。
    if (distance(position, goal) > 0.16) return step(goal);
    if (this.waypoint === 'entrance') this.waypoint = 'bed';
    else { this.waypoint = null; position.copy(this.target.bed); }
    return false;
  }
  finish(): number {
    const reward = this.resting && this.rewardCooldown <= 0 ? DOGHOUSE_SLEEP_XP : 0;
    if (reward) this.rewardCooldown = REWARD_COOLDOWN;
    this.cancel();
    return reward;
  }
  restore(cooldown = 0): void {
    this.cancel();
    this.rewardCooldown = Number.isFinite(cooldown) ? Math.max(0, Math.min(REWARD_COOLDOWN, cooldown)) : 0;
  }
}
