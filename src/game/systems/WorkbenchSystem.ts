import * as THREE from 'three';
import type { Player } from '../entities/Player';
import { Workbench } from '../entities/Workbench';
import type { Inventory } from './Inventory';
import { WORKBENCH_COST, WORKBENCH_UPGRADE_STONES } from './Crafting';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';

const CRAFT_TIME = 2.4; // 制作总时长(秒)
const CRAFT_TICK = 0.6; // 每次敲击特效间隔(秒)
const FX_COLOR = '#c9a15c';
const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处落脚摆放
const NEAR_RANGE = 2.2; // 玩家距工作台小于该值时算在工作范围内

/**
 * 全局唯一的工作台:材料满足且场上没有工作台时可通过卡片发起制作,
 * 站定敲打完成后在玩家原位放置;已放置后可花费石头升级(最高 4 级),
 * 敲打完成后工作台换成更高等级的模型。
 */
export class WorkbenchSystem {
  private timer = 0;
  private tickTimer = 0;
  /** 当前计时流程是搭建新工作台还是升级现有工作台 */
  private mode: 'build' | 'upgrade' = 'build';
  private bench: Workbench | null = null;
  private scratch = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private inventory: Inventory,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio
  ) {}

  /** 场上是否已有工作台 */
  get exists(): boolean {
    return !!this.bench;
  }

  /** 当前工作台等级(没有工作台为 0) */
  get level(): number {
    return this.bench?.level ?? 0;
  }

  /** 玩家是否在的工作范围内(可打开制作面板) */
  get isNear(): boolean {
    if (!this.bench) return false;
    this.scratch.copy(this.bench.group.position);
    this.scratch.y = this.player.group.position.y;
    return this.scratch.distanceTo(this.player.group.position) < NEAR_RANGE;
  }

  get isWorking(): boolean {
    return this.timer > 0;
  }

  /** 当前是否在升级工作台 */
  get isUpgrading(): boolean {
    return this.isWorking && this.mode === 'upgrade';
  }

  /** 是否满足升级条件(有工作台、未满级、石头够、不在敲打中) */
  canUpgrade(): boolean {
    if (!this.bench || this.isWorking) return false;
    if (this.bench.level >= 4) return false;
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

  /** 是否满足发起条件(材料齐 + 没有工作台 + 当前位置可摆放) */
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

  /** 发起升级(站定敲打,完成后换更高等级模型),返回是否成功开始 */
  upgrade(): boolean {
    if (!this.canUpgrade()) return false;
    this.mode = 'upgrade';
    this.timer = 0.001;
    this.tickTimer = 0;
    return true;
  }

  update(delta: number): void {
    if (!this.isWorking) return;
    if (this.mode === 'build' ? this.exists : !this.exists) return;
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
        this.bench = new Workbench(this.scene, this.player.group.position);
      } else {
        this.inventory.remove('stone', WORKBENCH_UPGRADE_STONES);
        this.bench!.upgrade();
      }
      this.audio.play('success');
      const p = this.player.group.position.clone();
      p.y += 0.8;
      this.fx.burst(p, '#8a6239', 14);
    }
  }

  private cancel(): void {
    this.timer = 0;
  }

  /** 当前制作进度 0-1,未在制作时为 null */
  getProgress(): number | null {
    return this.isWorking ? Math.min(this.timer / CRAFT_TIME, 1) : null;
  }

  /** 工作台快照(没有工作台时为 null) */
  snapshot(): { x: number; y: number; z: number; level: number } | null {
    if (!this.bench) return null;
    const p = this.bench.group.position;
    return { x: p.x, y: p.y, z: p.z, level: this.bench.level };
  }

  /** 从存档恢复工作台(含等级) */
  restore(pos: { x: number; y: number; z: number; level: number }): void {
    this.bench = new Workbench(
      this.scene,
      new THREE.Vector3(pos.x, pos.y, pos.z),
      pos.level
    );
  }
}
