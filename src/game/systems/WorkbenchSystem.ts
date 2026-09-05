import * as THREE from 'three';
import type { ResourceKind } from './Inventory';
import { Workbench, WORKBENCH_MAX_LEVEL } from '../entities/Workbench';
import { WORKBENCH_COST, hasCost, workbenchUpgradeCost } from './Crafting';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { cardinalRotY } from '../core/Facing';
import { ActionHold } from './ActionHold';

const CRAFT_TIME = 2.4; // 制作总时长(秒)
const CRAFT_TICK = 0.6; // 每次敲击特效间隔(秒)
const FX_COLOR = '#c9a15c';
const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处落脚摆放
const NEAR_RANGE = 2.2; // 玩家距工作台小于该值时算在工作范围内
const DIG_RANGE = 1.6; // 持锄头可开挖工作台的距离
const DIG_HITS = 2; // 锄头挖工作台的命中次数(二级石锄 1 次)
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

/** 每玩家的搭建/升级/挖掘进度(工作台本身是世界共享的) */
type PlayerSessionState = {
  hold: ActionHold;
  timer: number;
  tickTimer: number;
  /** 当前计时流程是搭建新工作台还是升级现有工作台 */
  mode: 'build' | 'upgrade';
  /** 升级流程的目标工作台 */
  upgradeTarget: Workbench | null;
  digTarget: Workbench | null;
  swingTimer: number;
  hits: number;
};

/**
 * 工作台系统(世界单实例,按发起者 actor 结算,可放置多个):
 * - 材料满足且场上没有工作台时可通过卡片发起制作,站定敲打完成后在玩家原位放置;
 * - 已放置的工作台可花费石头升级(最高 4 级),操作目标为身旁最近的一台;
 * - 手持锄头靠近工作台站定可整台挖走,变成对应等级的工作台道具;
 * - 背包里点击「使用」工作台道具,校验通过后在玩家脚下原地放回该等级。
 */
export class WorkbenchSystem {
  private benches: Workbench[] = [];
  /** 本局是否已制作过工作台(制作卡片只在这局从未制作过时出现) */
  private crafted = false;
  private states = new Map<PlayerSession, PlayerSessionState>();
  private scratch = new THREE.Vector3();
  private ids = new WorldEntityIds<Workbench>('bench');
  private onChanged?: EntityChangeSink;
  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 挖走工作台时道具入包(背包放不下的部分由该函数掉到地上) */
    private give: (kind: 'workbench1' | 'workbench2' | 'workbench3' | 'workbench4', count: number, actor: PlayerSession) => number,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isBusy: (actor: PlayerSession) => boolean = () => false
  ) {}

  private st(actor: PlayerSession): PlayerSessionState {
    let st = this.states.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), timer: 0, tickTimer: 0, mode: 'build', upgradeTarget: null, digTarget: null, swingTimer: 0, hits: 0 };
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

  isWorking(actor: PlayerSession): boolean {
    return (this.states.get(actor)?.timer ?? 0) > 0;
  }

  /** 当前是否在升级工作台 */
  isUpgrading(actor: PlayerSession): boolean {
    const st = this.states.get(actor);
    return !!st && st.timer > 0 && st.mode === 'upgrade';
  }

  /** 正在挖工作台 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.states.get(actor)?.digTarget;
  }

  /** 是否满足升级条件(身旁有工作台、未满级、材料够、不在敲打中) */
  canUpgrade(actor: PlayerSession): boolean {
    const bench = this.nearby(actor);
    if (!bench || this.isWorking(actor) || this.isDigging(actor)) return false;
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

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点占住) */
  private canPlace(actor: PlayerSession): boolean {
    const p = actor.player.group.position;
    if (actor.player.isSwimming) return false;
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= 0) return false;
    return !this.props.isOccupied(p, PROP_BLOCK_RANGE);
  }

  /** 本局是否已制作过工作台 */
  get hasCrafted(): boolean {
    return this.crafted;
  }

  /** 是否满足发起条件(本局从未制作过 + 材料齐 + 脚下可摆放) */
  canStart(actor: PlayerSession): boolean {
    if (this.crafted || this.isWorking(actor) || this.isDigging(actor)) return false;
    if (actor.inventory.count('stone') < (WORKBENCH_COST.stone ?? 0)) return false;
    if (actor.inventory.count('branch') < (WORKBENCH_COST.branch ?? 0)) return false;
    return this.canPlace(actor);
  }

  start(actor: PlayerSession): boolean {
    if (!this.canStart(actor)) return false;
    const st = this.st(actor);
    st.mode = 'build';
    st.timer = 0.001;
    st.tickTimer = 0;
    return true;
  }

  /** 发起升级身旁工作台(站定敲打,完成后换更高等级模型),返回是否成功开始 */
  upgrade(actor: PlayerSession): boolean {
    if (!this.canUpgrade(actor)) return false;
    const st = this.st(actor);
    st.mode = 'upgrade';
    st.upgradeTarget = this.nearby(actor);
    st.timer = 0.001;
    st.tickTimer = 0;
    return true;
  }

  /** 每帧推进该玩家的搭建/升级/挖掘;帧末统一提交持有的动作,交互结束时自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      this.updateDig(actor, st, delta);
      if (st.timer <= 0) return;
      if (st.mode === 'upgrade' && !st.upgradeTarget) return;
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
      if (st.mode === 'build') {
        actor.inventory.remove('stone', WORKBENCH_COST.stone ?? 0);
        actor.inventory.remove('branch', WORKBENCH_COST.branch ?? 0);
        const bench = new Workbench(this.scene, actor.player.group.position, 1, cardinalRotY(actor.player.group.rotation.y));
        this.benches.push(bench);
        const bp = bench.group.position;
        this.onChanged?.({ op: 'add', id: this.ids.get(bench), value: { id: this.ids.get(bench), x: bp.x, y: bp.y, z: bp.z, rotY: bench.group.rotation.y, level: bench.level } });
        this.crafted = true;
        // 通用规则:刚放下的东西可被锄头挖走时收起锄头,避免原地立刻挖掉
        if (actor.player.currentTool === 'hoe') actor.player.setTool('hand');
      } else {
        for (const [kind, n] of Object.entries(workbenchUpgradeCost(st.upgradeTarget!.level))) {
          actor.inventory.remove(kind as ResourceKind, n ?? 0);
        }
        st.upgradeTarget!.upgrade();
        this.onChanged?.({ op: 'set', id: this.ids.get(st.upgradeTarget!), fields: { level: st.upgradeTarget!.level } });
        st.upgradeTarget = null;
      }
      this.audio.play('success');
      const p = actor.player.group.position.clone();
      p.y += 0.8;
      this.fx.burst(p, '#8a6239', 14);
    }
  }

  /** 手持锄头站定在工作台旁自动挖掘,命中数次后整台挖走(变成对应等级的道具) */
  private updateDig(actor: PlayerSession, st: PlayerSessionState, delta: number): void {
    const p = actor.player.group.position;
    let target: Workbench | null = null;
    if (
      actor.player.currentTool === 'hoe' &&
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
    if (st.hits < (actor.tools.hoe >= 2 ? 1 : DIG_HITS)) return;
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
    const need = actor.tools.hoe >= 2 ? 1 : DIG_HITS;
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  /** 背包里点击「使用」工作台道具:校验通过后在玩家脚下原地放回该等级 */
  placeItem(actor: PlayerSession, level: number): boolean {
    if (actor.inventory.count(BENCH_ITEM[level]) <= 0 || !this.canPlace(actor)) return false;
    actor.inventory.remove(BENCH_ITEM[level], 1);
    const bench = new Workbench(this.scene, actor.player.group.position, level, cardinalRotY(actor.player.group.rotation.y));
    this.benches.push(bench);
    const bp = bench.group.position;
    this.onChanged?.({ op: 'add', id: this.ids.get(bench), value: { id: this.ids.get(bench), x: bp.x, y: bp.y, z: bp.z, rotY: bench.group.rotation.y, level } });
    this.audio.play('success');
    const p = actor.player.group.position.clone();
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
