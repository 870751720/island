import type * as THREE from 'three';
import type { PlayerSession } from '../mp/PlayerSession';
import type { IslandTerrain } from '../world/IslandTerrain';
import { GuidanceEffect } from '../quests/GuidanceEffect';
import { QuestRoute } from '../quests/QuestRoute';
import { isDrinkablePond } from './WaterAccess';

type Point = { x: number; z: number };

/** 本地求生引导优先于任务；喝水恢复仍由既有权威系统负责。 */
export class ThirstGuidance {
  active = false;
  nearDrinkPoint = false;
  private effect: GuidanceEffect;
  private route: QuestRoute;
  private scan = 0;
  private target: Point | null = null;

  constructor(scene: THREE.Scene, private terrain: IslandTerrain) {
    this.route = new QuestRoute(terrain, (x, z) => terrain.getWaterKind(x, z) === null || isDrinkablePond(terrain, x, z));
    this.effect = new GuidanceEffect(scene, terrain, this.route);
  }

  update(delta: number, session: PlayerSession, photo: boolean): void {
    this.active = session.survival.state.thirst <= 0 && !session.survival.state.dead;
    this.nearDrinkPoint = false;
    const origin = session.player.group.position;
    if (!this.active || photo || session.player.isSwimming || session.water.isActive
      || isDrinkablePond(this.terrain, origin.x, origin.z)) {
      this.effect.hide();
      this.scan = 0;
      this.target = null;
      return;
    }
    this.scan -= delta;
    if (this.scan <= 0) {
      this.scan = 1;
      const path = this.route.find(origin, this.drinkPoints(), 1);
      this.target = path?.[path.length - 1] ?? null;
      this.effect.setPath(path);
    }
    if (this.target) {
      // 已在浅水中就不再催玩家前进；只在终点附近的岸边提醒。
      this.nearDrinkPoint = this.terrain.getWaterKind(origin.x, origin.z) === null
        && Math.hypot(origin.x - this.target.x, origin.z - this.target.z) <= 1.5
        && !session.collect.isWorking;
    }
    this.effect.update(delta, origin, true);
  }

  private drinkPoints(): Point[] {
    const points: Point[] = [];
    for (const pond of this.terrain.waterAreas) {
      // 从外向内采样不同方向的浅滩；实际水体判定排除海水、冰面与深水。
      for (let direction = 0; direction < 24; direction++) {
        const angle = direction * Math.PI * 2 / 24;
        for (let r = pond.radius + 1; r > 0; r -= 0.25) {
          const x = pond.x + Math.cos(angle) * r;
          const z = pond.z + Math.sin(angle) * r;
          if (!isDrinkablePond(this.terrain, x, z)) continue;
          const depth = this.terrain.getWaterLevel(x, z) - this.terrain.getHeight(x, z);
          if (depth < 0.08 || depth > 0.45) continue;
          points.push({ x, z });
          break;
        }
      }
    }
    return points;
  }

  dispose(): void { this.effect.dispose(); }
}
