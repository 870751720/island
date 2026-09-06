import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { AmbientPose } from '../net/Protocol';
import { landCells } from '../world/SpawnLayout';
import type { IslandTerrain } from '../world/IslandTerrain';
import { makeDropModel } from '../systems/DropModels';

/** 玩家靠到这个距离内,蚯蚓立刻钻土消失并留下战利品 */
const TOUCH_RANGE = 1.3;
/** 死亡个体的补充冷却区间(真实秒),逐只计时 */
const RECOVERY: [number, number] = [90, 150];
/** 只在水域周边这么多米内的干地上落点(沿用原蚯蚓土坑的水边分布) */
const WATER_BAND = 18;
/** 种群目标数量沿用原蚯蚓土坑的密度:每万㎡ 7 只 × 有效陆地面积 */
const DENSITY_PER_10K = 7;

type Worm = {
  /** 联机同步用稳定 id */
  id: number;
  group: THREE.Object3D;
  pos: THREE.Vector3;
  phase: number;
};

/**
 * 水边干地上的蚯蚓生物:完全静止,任何玩家靠近即钻土消失(无死亡显影),
 * 权威端(单机/房主)在原地掉落蚯蚓道具;种群数量与原蚯蚓土坑密度一致,
 * 死亡个体冷却后在水边其他位置补充。客人端只按房主快照补建/移除。
 */
export class Worms implements Updatable {
  readonly group = new THREE.Group();
  private worms: Worm[] = [];
  private nextId = 0;
  /** 每个死亡个体的剩余补充冷却 */
  private respawns: number[] = [];
  private readonly desiredCount: number;

  constructor(
    scene: THREE.Scene,
    private terrain: IslandTerrain,
    /** 所有玩家的位置(联机时任一玩家靠近都会触发钻土) */
    private playerPositions: () => THREE.Vector3[],
    /** 蚯蚓钻土时在原地掉落蚯蚓道具(仅权威端调用) */
    private onForage: (x: number, z: number) => void = () => {}
  ) {
    const cells = landCells(this.terrain);
    this.desiredCount = Math.max(4, Math.round((cells.length * 16 * DENSITY_PER_10K) / 10000));
    for (let i = 0; i < this.desiredCount; i++) {
      const spot = this.findSpot();
      if (spot) this.createWorm(this.nextId++, spot);
    }
    scene.add(this.group);
  }

  /** 水边干地上的随机落点:高于水面、不贴水、又在水域周边带内 */
  private findSpot(): THREE.Vector3 | null {
    const cells = landCells(this.terrain);
    for (let tries = 0; tries < 40; tries++) {
      const c = cells[Math.floor(Math.random() * cells.length)];
      if (!c) break;
      const x = c.x + (Math.random() - 0.5) * 4;
      const z = c.z + (Math.random() - 0.5) * 4;
      const y = this.terrain.getHeight(x, z);
      const p = new THREE.Vector3(x, y, z);
      if (y <= 0.3 || this.terrain.isNearWater(p, 1)) continue;
      if (!this.terrain.waterAreas.some((w) => Math.hypot(x - w.x, z - w.z) < w.radius + WATER_BAND)) continue;
      return p;
    }
    return null;
  }

  private createWorm(id: number, spawn: THREE.Vector3): Worm {
    // 生物直接复用蚯蚓道具的掉落模型
    const group = makeDropModel('worm');
    group.position.copy(spawn);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.group.add(group);
    const worm: Worm = { id, group, pos: spawn.clone(), phase: Math.random() * Math.PI * 2 };
    this.worms.push(worm);
    return worm;
  }

  /** 权威端帧推进:玩家靠近即钻土消失并掉落,随后进入补充冷却 */
  update(delta: number, elapsed: number): void {
    const players = this.playerPositions();
    for (let i = this.worms.length - 1; i >= 0; i--) {
      const worm = this.worms[i];
      if (players.some((p) => Math.hypot(p.x - worm.pos.x, p.z - worm.pos.z) < TOUCH_RANGE)) {
        this.group.remove(worm.group);
        this.worms.splice(i, 1);
        this.onForage(worm.pos.x, worm.pos.z);
        this.respawns.push(RECOVERY[0] + Math.random() * (RECOVERY[1] - RECOVERY[0]));
        continue;
      }
      // 静止蚯蚓只有轻微的蠕动起伏
      worm.group.position.y = worm.pos.y + Math.sin(elapsed * 1.6 + worm.phase) * 0.012;
    }
    // 种群补充:冷却到期且落点远离所有玩家时才刷新
    for (let i = this.respawns.length - 1; i >= 0; i--) {
      this.respawns[i] -= delta;
      if (this.respawns[i] > 0) continue;
      const spot = this.findSpot();
      if (!spot) {
        this.respawns[i] = 10;
        continue;
      }
      if (this.playerPositions().some((p) => Math.hypot(p.x - spot.x, p.z - spot.z) < 20)) {
        this.respawns[i] = 10; // 玩家眼前不刷,稍后再试
        continue;
      }
      this.respawns.splice(i, 1);
      this.createWorm(this.nextId++, spot);
    }
  }

  netPoses(): AmbientPose[] {
    return this.worms.map((worm) => ({
      id: worm.id,
      x: worm.pos.x,
      y: worm.pos.y,
      z: worm.pos.z,
      h: 0,
      visible: true,
    }));
  }

  /** 客人侧:按房主快照补建新个体、移除已钻土的个体 */
  netApply(poses: AmbientPose[]): void {
    const map = new Map(poses.map((p) => [p.id, p]));
    for (let i = this.worms.length - 1; i >= 0; i--) {
      if (!map.has(this.worms[i].id)) {
        this.group.remove(this.worms[i].group);
        this.worms.splice(i, 1);
      }
    }
    for (const pose of poses) {
      if (!pose.visible || this.worms.some((w) => w.id === pose.id)) continue;
      this.createWorm(pose.id, new THREE.Vector3(pose.x, pose.y, pose.z));
      this.nextId = Math.max(this.nextId, pose.id + 1);
    }
  }

  /** 客人侧:蚯蚓静止,只保留蠕动表现 */
  netUpdate(delta: number, elapsed: number): void {
    for (const worm of this.worms) {
      worm.group.position.y = worm.pos.y + Math.sin(elapsed * 1.6 + worm.phase) * 0.012;
    }
  }
}
