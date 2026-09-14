import { Vector2 } from 'three';
import type { PlayerSession } from '../mp/PlayerSession';
import type { IslandTerrain } from '../world/IslandTerrain';
import { isDrinkablePond } from '../systems/WaterAccess';
import { QuestRoute } from './QuestRoute';

type Point = { x: number; z: number };
export type QuestMoveTarget = Point & { key: string; drink: boolean; radius: number };

/** 本地寻路只产生普通移动输入，沿既有碰撞及联机移动链路执行。 */
export class QuestAutoMove {
  active = false;
  private goal: QuestMoveTarget | null = null;
  private route: QuestRoute;
  private path: Point[] = [];
  private index = 0;
  private repath = 0;
  private stuck = 0;
  private previous: Point | null = null;
  private manual = new Vector2();

  constructor(private terrain: IslandTerrain, private blocked: (x: number, z: number) => boolean,
    private write: (x: number, z: number) => void, private notice: (text: string) => void) {
    this.route = new QuestRoute(terrain, (x, z) => this.passable(x, z));
  }

  private passable(x: number, z: number): boolean {
    // 为逐帧转向留出余量，防止抵达采样点前转弯切进障碍边缘。
    if ([[0, 0], [0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]].some(([dx, dz]) => this.blocked(x + dx, z + dz))) return false;
    return this.terrain.getWaterKind(x, z) === null || (!!this.goal?.drink && isDrinkablePond(this.terrain, x, z));
  }

  stop(): void {
    if (this.active) this.write(0, 0);
    this.active = false; this.goal = null; this.path = []; this.previous = null;
  }

  start(target: QuestMoveTarget, session: PlayerSession): void {
    this.stop();
    this.goal = { ...target }; this.active = true; this.repath = 0; this.stuck = 0;
    // 路线可通行规则会随饮水目标变化，开始时使用全新缓存。
    this.route = new QuestRoute(this.terrain, (x, z) => this.passable(x, z));
    this.update(0, session, target, false);
  }

  update(delta: number, session: PlayerSession, target: QuestMoveTarget | null, paused: boolean): void {
    if (!this.active || !this.goal) return;
    if (paused || session.survival.state.dead || session.player.isSwimming || session.quests.view?.busy
      || !target || target.key !== this.goal.key || session.player.input.getManualVector(this.manual).lengthSq() > 0.001) { this.stop(); return; }
    const origin = session.player.group.position;
    if (target.drink && isDrinkablePond(this.terrain, origin.x, origin.z)) { this.stop(); return; }
    this.repath -= delta;
    if (this.repath <= 0) {
      this.repath = 1;
      this.goal = { ...target };
      const candidates: Point[] = [];
      if (target.drink) candidates.push(target);
      else for (let i = 0; i < 16; i++) {
        const angle = i * Math.PI * 2 / 16;
        candidates.push({ x: target.x + Math.cos(angle) * target.radius, z: target.z + Math.sin(angle) * target.radius });
      }
      this.path = this.route.find(origin, candidates, 1) ?? [];
      this.index = 0;
      if (!this.path.length) { this.stop(); this.notice('暂时没有可通行的路线，请移动后再试。'); return; }
    }
    const end = this.path[this.path.length - 1];
    if (Math.hypot(origin.x - end.x, origin.z - end.z) < 0.12 && !target.drink) {
      if (Math.hypot(origin.x - target.x, origin.z - target.z) <= target.radius + 0.35) this.stop();
      else { this.repath = 0; this.write(0, 0); }
      return;
    }
    // 逐段行走，跨过贴地采样点后前进到下一点，不抄近路穿过拐角。
    while (this.index < this.path.length - 1 && Math.hypot(origin.x - this.path[this.index].x, origin.z - this.path[this.index].z) < 0.12) this.index++;
    const next = this.path[this.index];
    const dx = next.x - origin.x, dz = next.z - origin.z;
    const length = Math.hypot(dx, dz);
    if (this.previous && Math.hypot(origin.x - this.previous.x, origin.z - this.previous.z) < 0.01) this.stuck += delta;
    else this.stuck = 0;
    this.previous = { x: origin.x, z: origin.z };
    if (this.stuck >= 2) { this.stop(); this.notice('前方被挡住了，已停止自动移动。'); return; }
    if (length > 0.01) this.write(dx / length, dz / length);
    else { this.stop(); }
  }
}
