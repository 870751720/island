import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { Inventory } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import { SEED_OF, TREE_SPECIES, type TreeSpecies } from '../world/TreeSpecies';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';

const PLANT_TIME = 2; // 站定到完成播种的时长(秒)
const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处下种

/** 背包里第一粒种子(按格子顺序),没有种子返回 null */
function firstSeed(inventory: Inventory): { species: TreeSpecies } | null {
  for (const species of TREE_SPECIES) {
    if (inventory.count(SEED_OF[species]) > 0) return { species };
  }
  return null;
}

/**
 * 手持种子站定在可播种的空地上 2 秒后自动播种:
 * 与工作台摆放心智一致,不能在水中/水边,落点也不能被资源点占住。
 */
export class PlantingSystem {
  private timer = 0;
  private scratch = new THREE.Vector3();

  constructor(
    private player: Player,
    private inventory: Inventory,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 其他占用双手的行为(如合成/进食中),为真时播种让位 */
    private isBusy: () => boolean = () => false
  ) {}

  /** 当前位置是否允许播种(不在水里/水边,脚下没有被资源点占住) */
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

  get isWorking(): boolean {
    return this.timer > 0;
  }

  update(delta: number): void {
    const seed = this.player.currentTool === 'seed' ? firstSeed(this.inventory) : null;
    if (!seed || this.player.isMoving || this.player.isSwimming || this.isBusy() || !this.canPlace()) {
      this.timer = 0;
      return;
    }
    this.player.setAction('pick');
    this.timer += delta;
    if (this.timer < PLANT_TIME) return;
    this.timer = 0;
    this.inventory.remove(SEED_OF[seed.species], 1);
    const p = this.player.group.position;
    this.props.plant(seed.species, p.x, p.z);
    this.audio.play('success');
    const fxPos = p.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#7fae55', 10);
  }

  /** 当前播种进度 0-1,未在播种时为 null */
  getProgress(): number | null {
    return this.isWorking ? Math.min(this.timer / PLANT_TIME, 1) : null;
  }
}
