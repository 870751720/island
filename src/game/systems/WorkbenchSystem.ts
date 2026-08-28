import * as THREE from 'three';
import type { Player } from '../entities/Player';
import { Workbench } from '../entities/Workbench';
import type { Inventory } from './Inventory';
import { WORKBENCH_COST } from './Crafting';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';

const CRAFT_TIME = 2.4; // 制作总时长(秒)
const CRAFT_TICK = 0.6; // 每次敲击特效间隔(秒)
const FX_COLOR = '#c9a15c';
const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处落脚摆放

/**
 * 全局唯一的工作台:材料满足且场上没有工作台时可通过卡片发起制作,
 * 站定敲打完成后在玩家原位放置;在水中或脚下被树石等资源点占住时无法制作。
 */
export class WorkbenchSystem {
  private timer = 0;
  private tickTimer = 0;
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

  get isWorking(): boolean {
    return this.bench === null && this.timer > 0;
  }

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点占住) */
  private canPlace(): boolean {
    const p = this.player.group.position;
    if (this.player.isSwimming) return false;
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= 0) return false;
    return !this.props.list.some((prop) => {
      this.scratch.copy(prop.position);
      return this.scratch.distanceTo(p) < PROP_BLOCK_RANGE;
    });
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
    this.timer = 0.001;
    this.tickTimer = 0;
    return true;
  }

  update(delta: number): void {
    if (!this.isWorking) return;
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
      this.inventory.remove('stone', WORKBENCH_COST.stone ?? 0);
      this.inventory.remove('wood', WORKBENCH_COST.wood ?? 0);
      this.bench = new Workbench(this.scene, this.player.group.position);
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
}
