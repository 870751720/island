import * as THREE from 'three';
import type { Player } from '../entities/Player';
import { Workbench, WORKBENCH_MAX_LEVEL } from '../entities/Workbench';
import type { Inventory } from './Inventory';
import { WORKBENCH_COST, WORKBENCH_UPGRADE_STONES, type Tools } from './Crafting';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';

const CRAFT_TIME = 2.4; // 制作总时长(秒)
const CRAFT_TICK = 0.6; // 每次敲击特效间隔(秒)
const FX_COLOR = '#c9a15c';
const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处落脚摆放
const NEAR_RANGE = 2.2; // 玩家距工作台小于该值时算在工作范围内
const DIG_RANGE = 1.6; // 持锄头可开挖工作台的距离
const DIG_HITS = 2; // 锄头挖工作台的命中次数(精致石锄 1 次)
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)

/** 各等级工作台对应的道具 */
const BENCH_ITEM: Record<number, 'workbench1' | 'workbench2' | 'workbench3' | 'workbench4'> = {
  1: 'workbench1',
  2: 'workbench2',
  3: 'workbench3',
  4: 'workbench4',
};

/** 工作台道具对应的等级 */
export function workbenchItemLevel(kind: string): number | null {
  const level = Number(kind.replace('workbench', ''));
  return level >= 1 && level <= WORKBENCH_MAX_LEVEL ? level : null;
}

/**
 * 工作台系统(可放置多个):
 * - 材料满足且场上没有工作台时可通过卡片发起制作,站定敲打完成后在玩家原位放置;
 * - 已放置的工作台可花费石头升级(最高 4 级),操作目标为身旁最近的一台;
 * - 手持锄头靠近工作台站定可整台挖走,变成对应等级的工作台道具;
 * - 背包里点击「使用」工作台道具,校验通过后在玩家脚下原地放回该等级。
 */
export class WorkbenchSystem {
  private timer = 0;
  private tickTimer = 0;
  /** 当前计时流程是搭建新工作台还是升级现有工作台 */
  private mode: 'build' | 'upgrade' = 'build';
  private benches: Workbench[] = [];
  /** 升级流程的目标工作台 */
  private upgradeTarget: Workbench | null = null;
  private digTarget: Workbench | null = null;
  private swingTimer = 0;
  private hits = 0;
  private scratch = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private inventory: Inventory,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    private tools: Tools,
    /** 挖走工作台时道具入包(背包放不下的部分由该函数掉到地上) */
    private give: (kind: 'workbench1' | 'workbench2' | 'workbench3' | 'workbench4', count: number) => number,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isBusy: () => boolean = () => false
  ) {}

  /** 场上是否有工作台 */
  get exists(): boolean {
    return this.benches.length > 0;
  }

  /** 玩家身旁最近的工作台(范围内的),无则 null */
  get nearby(): Workbench | null {
    let best: Workbench | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const bench of this.benches) {
      this.scratch.copy(bench.group.position);
      this.scratch.y = this.player.group.position.y;
      const d = this.scratch.distanceToSquared(this.player.group.position);
      if (d < bestDist) {
        best = bench;
        bestDist = d;
      }
    }
    return best;
  }

  /** 玩家是否在任一工作台范围内(可打开制作面板) */
  get isNear(): boolean {
    return !!this.nearby;
  }

  /** 玩家身旁工作台的等级(不在旁为 0) */
  get level(): number {
    return this.nearby?.level ?? 0;
  }

  get isWorking(): boolean {
    return this.timer > 0;
  }

  /** 当前是否在升级工作台 */
  get isUpgrading(): boolean {
    return this.isWorking && this.mode === 'upgrade';
  }

  /** 正在挖工作台 */
  get isDigging(): boolean {
    return !!this.digTarget;
  }

  /** 是否满足升级条件(身旁有工作台、未满级、石头够、不在敲打中) */
  canUpgrade(): boolean {
    const bench = this.nearby;
    if (!bench || this.isWorking || this.isDigging) return false;
    if (bench.level >= WORKBENCH_MAX_LEVEL) return false;
    return this.inventory.count('stone') >= WORKBENCH_UPGRADE_STONES;
  }

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点占住) */
  private canPlace(): boolean {
    const p = this.player.group.position;
    if (this.player.isSwimming) return false;
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= 0) return false;
    return !this.props.isOccupied(p, PROP_BLOCK_RANGE);
  }

  /** 是否满足发起条件(材料齐 + 场上没有工作台 + 当前位置可摆放) */
  canStart(): boolean {
    if (this.exists || this.isWorking) return false;
    if (this.inventory.count('stone') < (WORKBENCH_COST.stone ?? 0)) return false;
    if (this.inventory.count('wood') < (WORKBENCH_COST.wood ?? 0)) return false;
    return this.canPlace();
  }

  start(): boolean {
    if (!this.canStart()) return false;
    this.mode = 'build';
    this.timer = 0.001;
    this.tickTimer = 0;
    return true;
  }

  /** 发起升级身旁工作台(站定敲打,完成后换更高等级模型),返回是否成功开始 */
  upgrade(): boolean {
    if (!this.canUpgrade()) return false;
    this.mode = 'upgrade';
    this.upgradeTarget = this.nearby;
    this.timer = 0.001;
    this.tickTimer = 0;
    return true;
  }

  update(delta: number): void {
    this.updateDig(delta);
    if (!this.isWorking) return;
    if (this.mode === 'build' ? this.exists : !this.upgradeTarget) return;
    if (this.player.isMoving || this.player.isSwimming) {
      this.cancel();
      return;
    }
    this.player.setAction('craft');
    this.timer += delta;
    this.tickTimer += delta;
    if (this.tickTimer >= CRAFT_TICK) {
      this.tickTimer -= CRAFT_TICK;
      this.audio.play('knock');
      const p = this.player.group.position.clone();
      p.y += 0.6;
      this.fx.burst(p, FX_COLOR, 5);
    }
    if (this.timer >= CRAFT_TIME) {
      this.timer = 0;
      if (this.mode === 'build') {
        this.inventory.remove('stone', WORKBENCH_COST.stone ?? 0);
        this.inventory.remove('wood', WORKBENCH_COST.wood ?? 0);
        this.benches.push(new Workbench(this.scene, this.player.group.position));
      } else {
        this.inventory.remove('stone', WORKBENCH_UPGRADE_STONES);
        this.upgradeTarget!.upgrade();
        this.upgradeTarget = null;
      }
      this.audio.play('success');
      const p = this.player.group.position.clone();
      p.y += 0.8;
      this.fx.burst(p, '#8a6239', 14);
    }
  }

  /** 手持锄头站定在工作台旁自动挖掘,命中数次后整台挖走(变成对应等级的道具) */
  private updateDig(delta: number): void {
    const p = this.player.group.position;
    let target: Workbench | null = null;
    if (
      this.player.currentTool === 'hoe' &&
      !this.player.isSwimming &&
      !this.isWorking &&
      !this.isBusy()
    ) {
      for (const bench of this.benches) {
        this.scratch.copy(bench.group.position);
        this.scratch.y = p.y;
        if (this.scratch.distanceTo(p) < DIG_RANGE) {
          target = bench;
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
    this.fx.burst(target.group.position, '#8a6239', 6);
    this.hits += 1;
    if (this.hits < (this.tools.hoe >= 2 ? 1 : DIG_HITS)) return;
    this.hits = 0;
    this.digTarget = null;
    this.benches.splice(this.benches.indexOf(target), 1);
    this.scene.remove(target.group);
    this.give(BENCH_ITEM[target.level], 1);
    this.audio.play('pickup');
    this.fx.burst(target.group.position, '#8a6239', 14);
  }

  /** 当前挖掘进度 0-1,未在挖掘时为 null */
  getDigProgress(): number | null {
    if (!this.digTarget) return null;
    const need = this.tools.hoe >= 2 ? 1 : DIG_HITS;
    return Math.min((this.hits + this.swingTimer / SWING_TIME) / need, 1);
  }

  /** 背包里点击「使用」工作台道具:校验通过后在玩家脚下原地放回该等级 */
  placeItem(level: number): boolean {
    if (this.inventory.count(BENCH_ITEM[level]) <= 0 || !this.canPlace()) return false;
    this.inventory.remove(BENCH_ITEM[level], 1);
    this.benches.push(new Workbench(this.scene, this.player.group.position, level));
    this.audio.play('success');
    const p = this.player.group.position.clone();
    p.y += 0.8;
    this.fx.burst(p, '#8a6239', 10);
    return true;
  }

  private cancel(): void {
    this.timer = 0;
    this.upgradeTarget = null;
  }

  /** 当前制作进度 0-1,未在制作时为 null */
  getProgress(): number | null {
    return this.isWorking ? Math.min(this.timer / CRAFT_TIME, 1) : null;
  }

  /** 全部工作台快照(落点与等级) */
  snapshot(): { x: number; y: number; z: number; level: number }[] {
    return this.benches.map((bench) => {
      const p = bench.group.position;
      return { x: p.x, y: p.y, z: p.z, level: bench.level };
    });
  }

  /** 从存档恢复全部工作台(含等级) */
  restore(list: { x: number; y: number; z: number; level: number }[]): void {
    for (const b of list) {
      this.benches.push(new Workbench(this.scene, new THREE.Vector3(b.x, b.y, b.z), b.level));
    }
  }
}
