import * as THREE from 'three';
import type { Player } from '../entities/Player';
import { Bed, BED_MAX_LEVEL } from '../entities/Bed';
import type { Inventory, ResourceKind } from './Inventory';
import type { Tools } from './Crafting';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';

const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处摆放
const BED_BLOCK_RANGE = 1.1; // 与其他床重叠距离小于该值时无处摆放
const NEAR_RANGE = 2.2; // 玩家距床小于该值时算在床旁
const DIG_RANGE = 1.6; // 持锄头可开挖床的距离
const DIG_HITS = 2; // 锄头挖床的命中次数(精致石锄 1 次)
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)
const SLEEP_TIME = 3; // 睡觉过渡时长(秒)

/** 各等级床对应的道具 */
const BED_ITEM: Record<number, 'bed1' | 'bed2'> = { 1: 'bed1', 2: 'bed2' };

/** 床道具对应的等级(非床道具为 null) */
export function bedItemLevel(kind: string): number | null {
  const level = Number(kind.replace('bed', ''));
  return level >= 1 && level <= BED_MAX_LEVEL ? level : null;
}

/**
 * 床系统(可放置多个):
 * - 床在工作台制作(树枝×8 + 石头×2 + 绳线×2),背包里点「使用」放到脚下;
 * - 手持锄头靠近床站定可整张挖走,变成对应等级的床道具;
 * - 靠近床点工具按钮发起睡觉,过渡片刻后一觉跳到第二天清晨(结算由回调交给外层)。
 */
export class BedSystem {
  private beds: Bed[] = [];
  private scratch = new THREE.Vector3();
  private swingTimer = 0;
  private hits = 0;
  private digTarget: Bed | null = null;
  private sleepTimer = 0;
  private onWake: (() => void) | null = null;

  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private inventory: Inventory,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    private tools: Tools,
    /** 挖走床时道具入包(背包放不下的部分由该函数掉到地上) */
    private give: (kind: ResourceKind, count: number) => number,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isOtherBusy: () => boolean = () => false
  ) {}

  /** 玩家身旁最近的床(范围内的),无则 null */
  get nearby(): Bed | null {
    let best: Bed | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const bed of this.beds) {
      this.scratch.copy(bed.group.position);
      this.scratch.y = this.player.group.position.y;
      const d = this.scratch.distanceToSquared(this.player.group.position);
      if (d < bestDist) {
        best = bed;
        bestDist = d;
      }
    }
    return best;
  }

  /** 正在睡觉(过渡阶段) */
  get isSleeping(): boolean {
    return this.sleepTimer > 0;
  }

  /** 正在挖床 */
  get isDigging(): boolean {
    return !!this.digTarget;
  }

  /** 睡觉或挖掘中(占用,其他双手行为让位) */
  get isBusy(): boolean {
    return this.isSleeping || this.isDigging;
  }

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点或其他床占住) */
  private canPlace(): boolean {
    const p = this.player.group.position;
    if (this.player.isSwimming) return false;
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
  place(level: number): boolean {
    if (this.inventory.count(BED_ITEM[level]) <= 0 || !this.canPlace()) return false;
    this.inventory.remove(BED_ITEM[level], 1);
    this.beds.push(new Bed(this.scene, this.player.group.position, level));
    this.audio.play('success');
    const fxPos = this.player.group.position.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#c9a15c', 10);
    return true;
  }

  /** 靠近床发起睡觉,完成后回调 onWake 由外层结算(时间跳跃与状态变化),返回是否成功开始 */
  startSleep(onWake: () => void): boolean {
    if (this.isBusy || !this.nearby) return false;
    this.onWake = onWake;
    this.sleepTimer = 0.001;
    return true;
  }

  update(delta: number): void {
    this.updateDig(delta);
    if (!this.isSleeping) return;
    // 睡着后乱动就醒(不结算)
    if (this.player.isMoving || this.player.isSwimming) {
      this.sleepTimer = 0;
      this.onWake = null;
      return;
    }
    this.sleepTimer += delta;
    if (this.sleepTimer < SLEEP_TIME) return;
    this.sleepTimer = 0;
    const wake = this.onWake;
    this.onWake = null;
    wake?.();
  }

  /** 手持锄头站定在床旁自动挖掘,命中数次后整张挖走(变成对应等级的道具) */
  private updateDig(delta: number): void {
    const p = this.player.group.position;
    let target: Bed | null = null;
    if (
      this.player.currentTool === 'hoe' &&
      !this.player.isSwimming &&
      !this.isSleeping &&
      !this.isOtherBusy()
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
    if (!target || this.player.isMoving) {
      this.digTarget = null;
      this.swingTimer = 0;
      this.hits = 0;
      return;
    }
    this.digTarget = target;
    this.player.setAction('mine');
    this.swingTimer += delta;
    if (this.swingTimer < SWING_TIME) return;
    this.swingTimer = 0;
    this.fx.burst(target.group.position, '#c9a15c', 6);
    this.hits += 1;
    if (this.hits < (this.tools.hoe >= 2 ? 1 : DIG_HITS)) return;
    this.hits = 0;
    this.digTarget = null;
    this.beds.splice(this.beds.indexOf(target), 1);
    this.scene.remove(target.group);
    this.give(BED_ITEM[target.level], 1);
    this.audio.play('pickup');
    this.fx.burst(target.group.position, '#c9a15c', 14);
  }

  /** 当前挖床进度 0-1,未在挖掘时为 null */
  getDigProgress(): number | null {
    if (!this.digTarget) return null;
    const need = this.tools.hoe >= 2 ? 1 : DIG_HITS;
    return Math.min((this.hits + this.swingTimer / SWING_TIME) / need, 1);
  }

  /** 当前睡觉进度 0-1,未在睡觉时为 null */
  getSleepProgress(): number | null {
    return this.isSleeping ? Math.min(this.sleepTimer / SLEEP_TIME, 1) : null;
  }

  /** 当前所有床的存档快照(落点与等级) */
  snapshot(): { x: number; y: number; z: number; level: number }[] {
    return this.beds.map((bed) => {
      const p = bed.group.position;
      return { x: p.x, y: p.y, z: p.z, level: bed.level };
    });
  }

  /** 从存档恢复全部床(含等级) */
  restore(list: { x: number; y: number; z: number; level: number }[]): void {
    for (const b of list) {
      this.beds.push(new Bed(this.scene, new THREE.Vector3(b.x, b.y, b.z), b.level));
    }
  }
}
