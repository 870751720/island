import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { Wildlife, DogThreat } from '../entities/Wildlife';
import type { DogGrowth } from './DogGrowth';

export type DogCompanion = { player: Player; health: number; dead: boolean; fighting?: boolean };
export type DogCombatView = { phase: 'idle' | 'windup' | 'leap' | 'recover'; progress: number };
export const DOG_POUNCE_DURATION = 0.8;
export type DogCombatSave = { attackCooldown?: number; knockbackCooldown?: number; rescueCooldown?: number };

/** 护主目标与攻击结算独立于模型；狗不注册为野生动物的攻击目标，因此没有受伤入口。 */
export class DogCombat {
  view: DogCombatView = { phase: 'idle', progress: 0 };
  onPounce: (rescue: boolean) => void = () => {};
  moving = false;
  private target: DogThreat | null = null;
  private attackLeft = 0;
  private knockbackLeft = 0;
  private rescueLeft = 0;
  private reactionLeft = 0;
  private pounceTime = -1;
  private rescue = false;
  private hit = false;
  private encounterPlayer: Player | null = null;
  private quietTime = 0;
  private retreat = new THREE.Vector3();

  constructor(
    private wildlife: Wildlife,
    private growth: DogGrowth,
    private pos: THREE.Vector3,
    private move: (target: THREE.Vector3, speed: number, delta: number) => boolean,
    private face: (target: THREE.Vector3) => void,
    private shallow: (x: number, z: number) => boolean,
  ) {}

  get status() {
    return { target: this.target?.id ?? null, attack: this.attackLeft, knockback: this.knockbackLeft, rescue: this.rescueLeft };
  }

  snapshot(): DogCombatSave {
    return { attackCooldown: this.attackLeft, knockbackCooldown: this.knockbackLeft, rescueCooldown: this.rescueLeft };
  }

  restore(save: DogCombatSave): void {
    const valid = (n: number | undefined, max: number) => Number.isFinite(n) ? Math.min(max, Math.max(0, n!)) : 0;
    this.reset();
    this.attackLeft = valid(save.attackCooldown, 3);
    this.knockbackLeft = valid(save.knockbackCooldown, 10);
    this.rescueLeft = valid(save.rescueCooldown, 45);
  }

  reset(): void {
    this.attackLeft = this.knockbackLeft = this.rescueLeft = 0;
    this.target = null;
    this.pounceTime = -1;
    this.hit = false;
    this.encounterPlayer = null;
    this.view = { phase: 'idle', progress: 0 };
  }

  update(delta: number, companions: readonly DogCompanion[], preferred: Player): boolean {
    this.moving = false;
    this.attackLeft = Math.max(0, this.attackLeft - delta);
    this.knockbackLeft = Math.max(0, this.knockbackLeft - delta);
    this.rescueLeft = Math.max(0, this.rescueLeft - delta);
    const stage = this.growth.config;
    const live = (player: Player) => companions.find(c => c.player === player && !c.dead && c.health > 0);
    const distance = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);
    const threats = this.wildlife.dogThreats;
    const eligible = threats.filter(t => live(t.player) && this.shallow(t.pos.x, t.pos.z)
      && distance(t.pos, t.player.group.position) <= stage.range
      && distance(this.pos, t.player.group.position) <= stage.range + 3
      && distance(this.pos, t.pos) <= stage.range);

    // 一场参与过的护主战斗脱战 6 秒才发奖励；死亡、离线不能视为护主成功。
    if (this.encounterPlayer) {
      if (!live(this.encounterPlayer)) this.encounterPlayer = null;
      else if (threats.some(t => t.player === this.encounterPlayer)) this.quietTime = 0;
      else {
        this.quietTime += delta;
        if (this.quietTime >= 6) {
          this.growth.protectedPlayer();
          this.encounterPlayer = null;
        }
      }
    }

    if (!this.shallow(this.pos.x, this.pos.z)) {
      this.cancel();
      return false;
    }
    if (this.target) {
      const current = eligible.find(t => t.id === this.target!.id);
      if (!current) this.cancel();
      else this.target = current;
    }
    if (!this.target) {
      this.target = eligible.sort((a, b) => Number(b.player === preferred) - Number(a.player === preferred)
        || distance(this.pos, a.pos) - distance(this.pos, b.pos))[0] ?? null;
      this.reactionLeft = stage.reaction;
    }
    const target = this.target;
    if (!target) return false;
    this.face(target.pos);
    const health = live(target.player)?.health ?? 100;
    const canRescue = stage.stage === 5 && health <= 30 && this.rescueLeft <= 0;
    this.reactionLeft -= delta;
    if (this.reactionLeft > 0 && !canRescue) return true;

    if (this.pounceTime < 0) {
      if (distance(this.pos, target.pos) > stage.reach) {
        this.moving = this.move(target.pos, 5.2, delta);
        return true;
      }
      if (this.attackLeft > 0 && !canRescue) return true;
      this.rescue = canRescue;
      if (canRescue) this.rescueLeft = 45;
      this.pounceTime = 0;
      this.hit = false;
      this.onPounce(this.rescue);
    }

    this.pounceTime += delta;
    if (this.pounceTime < 0.18) {
      this.view = { phase: 'windup', progress: this.pounceTime / 0.18 };
    } else if (this.pounceTime < 0.5) {
      this.view = { phase: 'leap', progress: (this.pounceTime - 0.18) / 0.32 };
      this.moving = this.move(target.pos, 7, delta);
    } else {
      if (!this.hit) {
        this.hit = true;
        if (distance(this.pos, target.pos) <= 1.15) {
          const knockback = this.rescue || (stage.stage >= 4 && this.knockbackLeft <= 0);
          if (this.wildlife.dogBite(target.id, this.pos, stage.stage, knockback ? (this.rescue ? 1.6 : 0.9) : 0)) {
            if (knockback) this.knockbackLeft = 10;
            this.encounterPlayer = target.player;
            this.quietTime = 0;
          }
        }
        this.retreat.copy(this.pos).sub(target.pos).setY(0);
        if (this.retreat.lengthSq() < 0.001) this.retreat.set(1, 0, 0);
        this.retreat.normalize().multiplyScalar(0.4).add(this.pos);
        this.attackLeft = stage.interval;
      }
      this.view = { phase: 'recover', progress: Math.min(1, (this.pounceTime - 0.5) / 0.3) };
      this.moving = this.move(this.retreat, 1.4, delta);
      this.face(target.pos);
    }
    if (this.pounceTime >= DOG_POUNCE_DURATION) {
      this.pounceTime = -1;
      this.view = { phase: 'idle', progress: 0 };
    }
    return true;
  }

  private cancel(): void {
    // 中断也保留攻击间隔，不能通过切换目标连续扑咬。
    if (this.pounceTime >= 0) this.attackLeft = Math.max(this.attackLeft, this.growth.config.interval);
    this.target = null;
    this.pounceTime = -1;
    this.view = { phase: 'idle', progress: 0 };
  }
}
