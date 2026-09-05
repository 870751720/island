import type { Player } from '../entities/Player';
import type { Wildlife } from '../entities/Wildlife';
import type { ResourceKind } from './Inventory';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import { GmSystem } from './GmSystem';

/** 近战攻击范围:范围内有动物才会挥砍 */
const RANGE = 1.4;
/** 每次挥砍造成的伤害(按等级:木剑 10,石剑 16,铁剑 24) */
const DAMAGE = [10, 16, 24];
/** 挥砍间隔(秒) */
const ATTACK_INTERVAL = 0.8;
/** 挥砍动作时长(秒) */
const SWING_TIME = 0.35;

/**
 * 木剑:手持剑且近战范围内有动物时,按固定间隔自动挥砍。
 * 剑不参与自动切换(靠近动物不会自动上手,也不会因靠近资源点被顶掉之外的特殊处理),
 * 也不赋予任何采集资格——持剑时采集按徒手规则。
 * 联机约定(与弓一致):客人本地判定命中并播放挥砍表现,经 swordHit 动作上行,
 * 由房主权威结算伤害与掉落;房主自己的命中直接结算。
 */
export class SwordSystem {
  /** 挥砍动作剩余时长(0 表示空闲) */
  private swingLeft = 0;
  /** 距下次可挥砍的剩余时间 */
  private cooldownLeft = 0;

  constructor(
    private player: Player,
    private wildlife: Wildlife,
    private fx: Particles,
    private audio: GameAudio,
    /** 击杀掉落战利品(在击杀位置附近散落) */
    private onLoot: (
      items: { kind: ResourceKind; count: number }[],
      x: number,
      z: number
    ) => void,
    /** 客人端注入:本地判定命中后上行房主权威结算(伤害/掉落) */
    private onNetHit?: (animalId: number) => void,
    /** 当前剑等级(1 木剑 / 2 石剑 / 3 铁剑),缺省 1 */
    private getSwordTier: () => number = () => 1
  ) {}

  /** 挥砍动作期间占用双手(其他系统让位用) */
  get isWorking(): boolean {
    return this.swingLeft > 0;
  }

  update(delta: number, busy: boolean): void {
    if (this.swingLeft > 0) {
      this.swingLeft -= delta;
      if (this.swingLeft <= 0) this.player.setAction(null);
      return;
    }
    this.cooldownLeft = Math.max(0, this.cooldownLeft - delta);
    if (
      busy ||
      this.cooldownLeft > 0 ||
      this.player.currentTool !== 'sword' ||
      this.player.isSwimming
    ) {
      return;
    }
    const p = this.player.group.position;
    const animalId = this.wildlife.nearestId(p, RANGE);
    if (animalId === null) return;
    this.cooldownLeft = ATTACK_INTERVAL;
    this.swingLeft = SWING_TIME;
    this.player.setAction('slash');
    // 客人端音效由房主经 feedback 事件补播(与放箭同约定),本地不播避免重声
    if (!this.onNetHit) this.audio.play('chop');
    this.fx.burst(p.clone().setY(p.y + 0.9), '#e8e2d4', 4);
    if (this.onNetHit) {
      this.onNetHit(animalId);
    } else {
      this.settle(animalId);
    }
  }

  /** 房主对远程会话:只推进挥砍动作窗口(不做攻击判定),与弓的 updateVisuals 同约定 */
  updateVisuals(delta: number): void {
    if (this.swingLeft <= 0) return;
    this.swingLeft -= delta;
    if (this.swingLeft <= 0) this.player.setAction(null);
  }

  /** 权威结算一次命中:扣动物血量,击杀则掉落战利品 */
  private settle(animalId: number): void {
    const beast = this.wildlife.damage(
      animalId,
      DAMAGE[this.getSwordTier() - 1] * GmSystem.attackMultiplier
    );
    // 动物可中数刀:受伤未死不掉肉(战利品只随击杀掉落)
    if (!beast || beast === 'hit') return;
    const p = this.player.group.position;
    this.onLoot(this.wildlife.lootOf(beast.species), p.x, p.z);
  }

  /** 房主收到客人上行命中后的权威结算(表现已在客人端播过) */
  settleNetHit(animalId: number): void {
    this.settle(animalId);
  }

  /** 房主复现客人的挥砍动作(补放 chop 动作窗口,经姿态快照同步给各端) */
  netPlaySwing(): void {
    this.swingLeft = SWING_TIME;
    this.player.setAction('slash');
    this.audio.play('chop');
  }
}
