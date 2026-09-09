import * as THREE from 'three';
import { PlaceOccupancy } from './PlaceOccupancy';
import { shovelHits } from './ToolTiers';
import type { ResourceKind } from './Inventory';
import { Workbench, WORKBENCH_MAX_LEVEL } from '../entities/Workbench';
import { hasCost, workbenchUpgradeCost } from './Crafting';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { cardinalRotY } from '../core/Facing';
import { ActionHold } from './ActionHold';
import { dryCellReason } from './Facilities';

const CRAFT_TIME = 2.4; // 制作总时长(秒)
const CRAFT_TICK = 0.6; // 每次敲击特效间隔(秒)
const FX_COLOR = '#c9a15c';
const NEAR_RANGE = 2.2; // 玩家距工作台小于该值时算在工作范围内
const DIG_RANGE = 1.6; // 持铲子可开挖工作台的距离
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

/** 每玩家的升级/挖掘进度(工作台本身是世界共享的) */
type PlayerSessionState = {
  hold: ActionHold;
  timer: number;
  tickTimer: number;
  /** 升级流程的目标工作台 */
  upgradeTarget: Workbench | null;
  digTarget: Workbench | null;
  swingTimer: number;
  hits: number;
};

/**
 * 工作台系统(世界单实例,按发起者 actor 结算,可放置多个):
 * - 「工作台」道具经统一安放流程放回对应等级;
 * - 已放置的工作台可花费石头升级(最高 4 级),操作目标为身旁最近的一台;
 * - 手持铲子靠近工作台站定可整台挖走,变成对应等级的工作台道具。
 */
export class WorkbenchSystem {
  private benches: Workbench[] = [];
  /** 本局是否已放置过工作台(制作卡片只在这局从未放置过时出现) */
  private crafted = false;
  private states = new Map<PlayerSession, PlayerSessionState>();
  private scratch = new THREE.Vector3();
  private ids = new WorldEntityIds<Workbench>('bench');
  private onChanged?: EntityChangeSink;
  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }

  /** 岛上已放置的工作台数量 */
  get count(): number {
    return this.benches.length;
  }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 挖走工作台时道具入包(背包放不下的部分由该函数掉到地上) */
    private give: (kind: 'workbench1' | 'workbench2' | 'workbench3' | 'workbench4', count: number, actor: PlayerSession) => number,
    /** 统一安放占格判定:同格已被任何已放置实体占据时不可放 */
    private occupancy: PlaceOccupancy,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isBusy: (actor: PlayerSession) => boolean = () => false
  ) {}

  private st(actor: PlayerSession): PlayerSessionState {
    let st = this.states.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), timer: 0, tickTimer: 0, upgradeTarget: null, digTarget: null, swingTimer: 0, hits: 0 };
      this.states.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人进度 */
  detach(actor: PlayerSession): void {
    this.states.delete(actor);
  }

  /** 场上是否有工作台 */
  get exists(): boolean {
    return this.benches.length > 0;
  }

  /** 场上所有工作台落点(小地图标记用) */
  get positions(): { x: number; z: number }[] {
    return this.benches.map((b) => ({ x: b.group.position.x, z: b.group.position.z }));
  }

  /** 玩家身旁最近的工作台(范围内的),无则 null */
  nearby(actor: PlayerSession): Workbench | null {
    let best: Workbench | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const bench of this.benches) {
      this.scratch.copy(bench.group.position);
      this.scratch.y = actor.player.group.position.y;
      const d = this.scratch.distanceToSquared(actor.player.group.position);
      if (d < bestDist) {
        best = bench;
        bestDist = d;
      }
    }
    return best;
  }

  /** 玩家是否在任一工作台范围内(可打开制作面板) */
  isNear(actor: PlayerSession): boolean {
    return !!this.nearby(actor);
  }

  /** 玩家身旁工作台的等级(不在旁为 0) */
  level(actor: PlayerSession): number {
    return this.nearby(actor)?.level ?? 0;
  }

  /** 当前是否在升级工作台 */
  isUpgrading(actor: PlayerSession): boolean {
    return (this.states.get(actor)?.timer ?? 0) > 0;
  }

  /** 正在挖工作台 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.states.get(actor)?.digTarget;
  }

  /** 是否满足升级条件(身旁有工作台、未满级、材料够、不在敲打中) */
  canUpgrade(actor: PlayerSession): boolean {
    const bench = this.nearby(actor);
    if (!bench || this.isUpgrading(actor) || this.isDigging(actor)) return false;
    if (bench.level >= WORKBENCH_MAX_LEVEL) return false;
    return hasCost(workbenchUpgradeCost(bench.level), this.countsOf(actor, bench.level));
  }

  /** 升级材料在背包中的现存量(供 hasCost 校验) */
  private countsOf(actor: PlayerSession, level: number): Partial<Record<ResourceKind, number>> {
    const cost = workbenchUpgradeCost(level);
    return Object.fromEntries(
      (Object.keys(cost) as ResourceKind[]).map((kind) => [kind, actor.inventory.count(kind)])
    );
  }

  /** 指定落点是否允许摆放(不在水里/水边,落点没有被资源点占住) */
  /** 统一安放占格判定:该点同一格内是否有本系统放置的实体 */
  blocksCell(p: THREE.Vector3): boolean {
    return this.benches.some((e) => {
      this.scratch.copy(e.group.position);
      this.scratch.y = p.y;
      return this.scratch.distanceTo(p) < 1;
    });
  }

  canPlaceAt(actor: PlayerSession, x: number, z: number): string | null {
    return dryCellReason(actor, x, z, this.terrain, this.occupancy, this.props);
  }

  /** 本局是否已放置过工作台 */
  get hasCrafted(): boolean {
    return this.crafted;
  }

  /** 发起升级身旁工作台(站定敲打,完成后换更高等级模型),返回是否成功开始 */
  upgrade(actor: PlayerSession): boolean {
    if (!this.canUpgrade(actor)) return false;
    const st = this.st(actor);
    st.upgradeTarget = this.nearby(actor);
    st.timer = 0.001;
    st.tickTimer = 0;
    return true;
  }

  /** 每帧推进该玩家的升级/挖掘;帧末统一提交持有的动作,交互结束时自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      this.updateDig(actor, st, delta);
      if (st.timer <= 0 || !st.upgradeTarget) return;
      if (actor.player.isMoving || actor.player.isSwimming) {
        this.cancel(st);
        return;
      }
      this.updateWork(actor, st, delta);
    } finally {
      st.hold.commit(actor.player);
    }
  }

  private updateWork(actor: PlayerSession, st: PlayerSessionState, delta: number): void {
    st.hold.hold(actor.player, 'craft');
    st.timer += delta;
    st.tickTimer += delta;
    if (st.tickTimer >= CRAFT_TICK) {
      st.tickTimer -= CRAFT_TICK;
      this.audio.play('knock');
      const p = actor.player.group.position.clone();
      p.y += 0.6;
      this.fx.burst(p, FX_COLOR, 5);
    }
    if (st.timer >= CRAFT_TIME) {
      st.timer = 0;
      for (const [kind, n] of Object.entries(workbenchUpgradeCost(st.upgradeTarget!.level))) {
        actor.inventory.remove(kind as ResourceKind, n ?? 0);
      }
      st.upgradeTarget!.upgrade();
      this.onChanged?.({ op: 'set', id: this.ids.get(st.upgradeTarget!), fields: { level: st.upgradeTarget!.level } });
      st.upgradeTarget = null;
      this.audio.play('success');
      const p = actor.player.group.position.clone();
      p.y += 0.8;
      this.fx.burst(p, '#8a6239', 14);
    }
  }

  /** 手持铲子站定在工作台旁自动挖掘,命中数次后整台挖走(变成对应等级的道具) */
  private updateDig(actor: PlayerSession, st: PlayerSessionState, delta: number): void {
    const p = actor.player.group.position;
    let target: Workbench | null = null;
    if (
      actor.player.currentTool === 'shovel' &&
      !actor.player.isSwimming &&
      st.timer <= 0 &&
      !this.isBusy(actor)
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
    if (!target || actor.player.isMoving) {
      st.digTarget = null;
      st.swingTimer = 0;
      st.hits = 0;
      return;
    }
    st.digTarget = target;
    st.hold.hold(actor.player, 'mine');
    st.swingTimer += delta;
    if (st.swingTimer < SWING_TIME) return;
    st.swingTimer = 0;
    this.fx.burst(target.group.position, '#8a6239', 6);
    st.hits += 1;
    if (st.hits < (shovelHits(actor.tools.shovel))) return;
    st.hits = 0;
    st.digTarget = null;
    this.benches.splice(this.benches.indexOf(target), 1);
    this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
    this.scene.remove(target.group);
    this.give(BENCH_ITEM[target.level], 1, actor);
    this.fx.burst(target.group.position, '#8a6239', 14);
  }

  /** 当前挖掘进度 0-1,未在挖掘时为 null */
  getDigProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st?.digTarget) return null;
    const need = shovelHits(actor.tools.shovel);
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  /** 在吸附格中心放回该等级工作台(背包「使用」与手持自动安放共用入口),首次放置标记本局已制作 */
  placeItem(actor: PlayerSession, level: number, at: THREE.Vector3): boolean {
    if (actor.inventory.count(BENCH_ITEM[level]) <= 0 || this.canPlaceAt(actor, at.x, at.z) !== null) return false;
    actor.inventory.remove(BENCH_ITEM[level], 1);
    const bench = new Workbench(this.scene, at, level, cardinalRotY(actor.player.group.rotation.y));
    this.benches.push(bench);
    this.crafted = true;
    const bp = bench.group.position;
    this.onChanged?.({ op: 'add', id: this.ids.get(bench), value: { id: this.ids.get(bench), x: bp.x, y: bp.y, z: bp.z, rotY: bench.group.rotation.y, level } });
    this.audio.play('success');
    const p = bp.clone();
    p.y += 0.8;
    this.fx.burst(p, '#8a6239', 10);
    return true;
  }

  private cancel(st: PlayerSessionState): void {
    st.timer = 0;
    st.upgradeTarget = null;
  }

  /** 当前制作进度 0-1,未在制作时为 null */
  getProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    return st && st.timer > 0 ? Math.min(st.timer / CRAFT_TIME, 1) : null;
  }

  /** 全部工作台快照(落点与等级) */
  snapshot(): { id: string; x: number; y: number; z: number; rotY: number; level: number }[] {
    return this.benches.map((bench) => {
      const p = bench.group.position;
      return { id: this.ids.get(bench), x: p.x, y: p.y, z: p.z, rotY: bench.group.rotation.y, level: bench.level };
    });
  }

  /** 清空场上全部工作台(客人侧重放世界快照前调用,制作标记保留) */
  clear(): void {
    for (const bench of this.benches) this.scene.remove(bench.group);
    this.benches = [];
  }

  /** 从存档恢复本局已制作过工作台的标记 */
  restoreCrafted(): void {
    this.crafted = true;
  }

  /** 从存档恢复全部工作台(含等级) */
  restore(list: { id?: string; x: number; y: number; z: number; rotY?: number; level: number }[]): void {
    for (const b of list) {
      const bench = new Workbench(this.scene, new THREE.Vector3(b.x, b.y, b.z), b.level, b.rotY ?? 0);
      this.ids.set(bench, b.id);
      this.benches.push(bench);
    }
  }

  netApply(list: { id?: string; x: number; y: number; z: number; rotY?: number; level: number }[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.benches.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.benches[i]))) continue;
      this.scene.remove(this.benches[i].group);
      this.benches.splice(i, 1);
    }
    const current = new Map(this.benches.map((bench) => [this.ids.get(bench), bench]));
    for (const value of list) {
      let bench = value.id ? current.get(value.id) : undefined;
      if (!bench) {
        bench = new Workbench(this.scene, new THREE.Vector3(value.x, value.y, value.z), value.level, value.rotY ?? 0);
        this.ids.set(bench, value.id);
        this.benches.push(bench);
      } else while (bench.level < value.level) bench.upgrade();
    }
  }
}
