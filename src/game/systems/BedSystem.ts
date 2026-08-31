import * as THREE from 'three';
import { Bed, BED_MAX_LEVEL } from '../entities/Bed';
import type { ResourceKind } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';

const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处摆放
const BED_BLOCK_RANGE = 1.1; // 与其他床重叠距离小于该值时无处摆放
const NEAR_RANGE = 2.2; // 玩家距床小于该值时算在床旁
const DIG_RANGE = 1.6; // 持锄头可开挖床的距离
const DIG_HITS = 2; // 锄头挖床的命中次数(精致石锄 1 次)
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)
const SLEEP_TIME = 4; // 睡觉过渡时长(秒)
const SNORE_TICK = 1.2; // 打呼声间隔(秒)
/** 床垫顶面相对床摆点的高度(玩家身体中轴躺上去的高度,含背部半径) */
const LIE_HEIGHT = 0.56;
/** 躺平时脚跟相对床中心沿床身方向的偏移(玩家身长约 1.6,中心对齐) */
const LIE_FEET_OFFSET = 0.72;

/** 各等级床对应的道具 */
const BED_ITEM: Record<number, 'bed1' | 'bed2'> = { 1: 'bed1', 2: 'bed2' };

/** 床道具对应的等级(非床道具为 null) */
export function bedItemLevel(kind: string): number | null {
  const level = Number(kind.replace('bed', ''));
  return level >= 1 && level <= BED_MAX_LEVEL ? level : null;
}

/** 每玩家的挖掘与睡觉进度(床是世界共享的,进度各自算) */
type PlayerSessionState = {
  swingTimer: number;
  hits: number;
  digTarget: Bed | null;
  sleepTimer: number;
  snoreTimer: number;
  onWake: (() => void) | null;
};

/**
 * 床系统(世界单实例,按发起者 actor 结算,可放置多个):
 * - 床在工作台制作(树枝×8 + 石头×2 + 绳线×2),背包里点「使用」放到脚下;
 * - 手持锄头靠近床站定可整张挖走,变成对应等级的床道具;
 * - 靠近床点工具按钮发起睡觉,过渡片刻后一觉跳到第二天清晨(结算由回调交给外层)。
 */
export class BedSystem {
  private beds: Bed[] = [];
  private scratch = new THREE.Vector3();
  private states = new Map<PlayerSession, PlayerSessionState>();

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 挖走床时道具入包(背包放不下的部分由该函数掉到地上) */
    private give: (kind: ResourceKind, count: number, actor: PlayerSession) => number,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isOtherBusy: (actor: PlayerSession) => boolean = () => false
  ) {}

  private st(actor: PlayerSession): PlayerSessionState {
    let st = this.states.get(actor);
    if (!st) {
      st = { swingTimer: 0, hits: 0, digTarget: null, sleepTimer: 0, snoreTimer: 0, onWake: null };
      this.states.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人进度;睡到一半断线由外层复活逻辑兜底 */
  detach(actor: PlayerSession): void {
    this.states.delete(actor);
  }

  /** 场上所有床落点(小地图标记用) */
  get positions(): { x: number; z: number }[] {
    return this.beds.map((b) => ({ x: b.group.position.x, z: b.group.position.z }));
  }

  /** 玩家身旁最近的床(范围内的),无则 null */
  nearby(actor: PlayerSession): Bed | null {
    let best: Bed | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const bed of this.beds) {
      this.scratch.copy(bed.group.position);
      this.scratch.y = actor.player.group.position.y;
      const d = this.scratch.distanceToSquared(actor.player.group.position);
      if (d < bestDist) {
        best = bed;
        bestDist = d;
      }
    }
    return best;
  }

  /** 正在睡觉(过渡阶段) */
  isSleeping(actor: PlayerSession): boolean {
    return (this.states.get(actor)?.sleepTimer ?? 0) > 0;
  }

  /** 正在挖床 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.states.get(actor)?.digTarget;
  }

  /** 睡觉或挖掘中(占用,其他双手行为让位) */
  isBusy(actor: PlayerSession): boolean {
    return this.isSleeping(actor) || this.isDigging(actor);
  }

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点或其他床占住) */
  private canPlace(actor: PlayerSession): boolean {
    const p = actor.player.group.position;
    if (actor.player.isSwimming) return false;
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= 0) return false;
    if (
      this.beds.some((bed) => {
        this.scratch.copy(bed.group.position);
        return this.scratch.distanceTo(p) < BED_BLOCK_RANGE;
      })
    ) {
      return false;
    }
    return !this.props.isOccupied(p, PROP_BLOCK_RANGE);
  }

  /** 背包里点击「使用」床道具:校验通过后在玩家脚下原地放下该等级的床 */
  place(actor: PlayerSession, level: number): boolean {
    if (actor.inventory.count(BED_ITEM[level]) <= 0 || !this.canPlace(actor)) return false;
    actor.inventory.remove(BED_ITEM[level], 1);
    this.beds.push(new Bed(this.scene, actor.player.group.position, level));
    this.audio.play('success');
    const fxPos = actor.player.group.position.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#c9a15c', 10);
    return true;
  }

  /** 靠近床发起睡觉:玩家躺上床打呼,过渡中天空日夜流转;一旦睡下不可打断,睡满后回调 onWake 由外层结算 */
  startSleep(actor: PlayerSession, onWake: () => void): boolean {
    if (this.isBusy(actor) || !this.nearby(actor)) return false;
    const bed = this.nearby(actor)!;
    const st = this.st(actor);
    // 躺平朝向:身体(头朝枕头,即床身 -X 方向)与床身对齐
    const beta = bed.group.rotation.y;
    const feet = bed.group.position.clone();
    feet.x += Math.cos(beta) * LIE_FEET_OFFSET;
    feet.z -= Math.sin(beta) * LIE_FEET_OFFSET;
    feet.y += LIE_HEIGHT;
    actor.player.setSleeping(feet, beta + Math.PI / 2);
    st.onWake = onWake;
    st.sleepTimer = 0.001;
    st.snoreTimer = SNORE_TICK; // 入睡立刻先打一声呼
    return true;
  }

  /** 每帧推进该玩家的挖掘与睡觉 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    this.updateDig(actor, st, delta);
    if (st.sleepTimer <= 0) return;
    // 一旦睡着就必须睡满,移动不会打断(睡觉期间输入被忽略)
    st.sleepTimer += delta;
    st.snoreTimer += delta;
    if (st.snoreTimer >= SNORE_TICK) {
      st.snoreTimer = 0;
      this.audio.play('snore');
    }
    if (st.sleepTimer < SLEEP_TIME) return;
    st.sleepTimer = 0;
    actor.player.wakeUp();
    const wake = st.onWake;
    st.onWake = null;
    wake?.();
  }

  /** 手持锄头站定在床旁自动挖掘,命中数次后整张挖走(变成对应等级的道具) */
  private updateDig(actor: PlayerSession, st: PlayerSessionState, delta: number): void {
    const p = actor.player.group.position;
    let target: Bed | null = null;
    if (
      actor.player.currentTool === 'hoe' &&
      !actor.player.isSwimming &&
      st.sleepTimer <= 0 &&
      !this.isOtherBusy(actor)
    ) {
      for (const bed of this.beds) {
        this.scratch.copy(bed.group.position);
        this.scratch.y = p.y;
        if (this.scratch.distanceTo(p) < DIG_RANGE) {
          target = bed;
          break;
        }
      }
    }
    if (!target || actor.player.isMoving) {
      st.digTarget = null;
      st.swingTimer = 0;
      st.hits = 0;
      return;
    }
    st.digTarget = target;
    actor.player.setAction('mine');
    st.swingTimer += delta;
    if (st.swingTimer < SWING_TIME) return;
    st.swingTimer = 0;
    this.fx.burst(target.group.position, '#c9a15c', 6);
    st.hits += 1;
    if (st.hits < (actor.tools.hoe >= 2 ? 1 : DIG_HITS)) return;
    st.hits = 0;
    st.digTarget = null;
    this.beds.splice(this.beds.indexOf(target), 1);
    this.scene.remove(target.group);
    this.give(BED_ITEM[target.level], 1, actor);
    this.audio.play('pickup');
    this.fx.burst(target.group.position, '#c9a15c', 14);
  }

  /** 当前挖床进度 0-1,未在挖掘时为 null */
  getDigProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st?.digTarget) return null;
    const need = actor.tools.hoe >= 2 ? 1 : DIG_HITS;
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  /** 当前睡觉进度 0-1,未在睡觉时为 null */
  getSleepProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    return st && st.sleepTimer > 0 ? Math.min(st.sleepTimer / SLEEP_TIME, 1) : null;
  }

  /** 当前所有床的存档快照(落点与等级) */
  snapshot(): { x: number; y: number; z: number; level: number }[] {
    return this.beds.map((bed) => {
      const p = bed.group.position;
      return { x: p.x, y: p.y, z: p.z, level: bed.level };
    });
  }

  /** 清空场上全部床(客人侧重放世界快照前调用) */
  clear(): void {
    for (const bed of this.beds) this.scene.remove(bed.group);
    this.beds = [];
  }

  /** 从存档恢复全部床(含等级) */
  restore(list: { x: number; y: number; z: number; level: number }[]): void {
    for (const b of list) {
      this.beds.push(new Bed(this.scene, new THREE.Vector3(b.x, b.y, b.z), b.level));
    }
  }
}
