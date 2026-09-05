import * as THREE from 'three';
import { BaitBarrel } from '../entities/BaitBarrel';
import { BAIT_YIELD } from './Food';
import type { ResourceKind } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { cardinalRotY } from '../core/Facing';
import { ActionHold } from './ActionHold';

const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处摆放
const BARREL_BLOCK_RANGE = 0.8; // 与其他饵料桶重叠距离小于该值时无处摆放
const NEAR_RANGE = 2.2; // 玩家距饵料桶小于该值时算在桶旁
const DIG_RANGE = 1.6; // 持锄头可开挖饵料桶的距离
const DIG_HITS = 2; // 锄头挖饵料桶的命中次数(二级锄 1 次)
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)

/** 每 5 秒发酵 1 个食物为对应数量的鱼饵 */
export const BAIT_CONVERT_INTERVAL = 5;

/** 饵料桶存档/网络快照(落点 + 桶内食物队列与鱼饵存量) */
export type BaitBarrelSave = {
  id?: string;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  foods: { kind: ResourceKind; count: number }[];
  bait: number;
  tickLeft: number;
};

/** 每玩家的挖掘进度(世界里的饵料桶是共享的,进度各自算) */
type DigState = { hold: ActionHold; swingTimer: number; hits: number; digTarget: BaitBarrel | null };

/** 身旁饵料桶的 HUD 快照 */
export type BaitBarrelInfo = {
  foods: { kind: ResourceKind; count: number }[];
  bait: number;
  /** 当前发酵进度 0-1(无食物为 0) */
  progress: number;
};

/**
 * 饵料桶系统(世界单实例,按发起者 actor 结算):
 * - 背包里点击「使用」饵料桶,校验通过后在玩家脚下原地放下
 *   (与木箱摆放同一套规则:不能在水里/水边,脚下不能被资源点或其他饵料桶占住);
 * - 靠近后可把背包里的食物丢进桶:每 5 秒发酵 1 个食物,兑换为该食物对应数量的鱼饵,存放在桶内待收取;
 * - 手持锄头靠近站定自动整桶挖走(变回饵料桶道具,桶内食物与鱼饵一并回到背包/掉落)。
 * 发酵计时只在权威端(单机/房主)推进,客人端由世界增量回流并本地倒数做表现。
 */
export class BaitBarrelSystem {
  private barrels: BaitBarrel[] = [];
  private scratch = new THREE.Vector3();
  private ids = new WorldEntityIds<BaitBarrel>('baitBarrel');
  private onChanged?: EntityChangeSink;
  private digStates = new Map<PlayerSession, DigState>();

  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 收取/挖回的道具入包(背包放不下的部分由该函数掉到地上) */
    private give: (kind: ResourceKind, count: number, actor: PlayerSession) => number,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isBusy: (actor: PlayerSession) => boolean = () => false
  ) {}

  private st(actor: PlayerSession): DigState {
    let st = this.digStates.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), swingTimer: 0, hits: 0, digTarget: null };
      this.digStates.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人挖掘进度 */
  detach(actor: PlayerSession): void {
    this.digStates.delete(actor);
  }

  /** 玩家身旁最近的饵料桶(范围内的),无则 null */
  nearby(actor: PlayerSession): BaitBarrel | null {
    let best: BaitBarrel | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const barrel of this.barrels) {
      this.scratch.copy(barrel.group.position);
      this.scratch.y = actor.player.group.position.y;
      const d = this.scratch.distanceToSquared(actor.player.group.position);
      if (d < bestDist) {
        best = barrel;
        bestDist = d;
      }
    }
    return best;
  }

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点或其他饵料桶占住) */
  private canPlace(actor: PlayerSession): boolean {
    const p = actor.player.group.position;
    if (actor.player.isSwimming) return false;
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= 0) return false;
    if (
      this.barrels.some((barrel) => {
        this.scratch.copy(barrel.group.position);
        return this.scratch.distanceTo(p) < BARREL_BLOCK_RANGE;
      })
    ) {
      return false;
    }
    return !this.props.isOccupied(p, PROP_BLOCK_RANGE);
  }

  /** 背包里点击「使用」饵料桶:校验通过后在玩家脚下原地放下 */
  use(actor: PlayerSession): boolean {
    if (actor.inventory.count('baitBarrel') <= 0 || !this.canPlace(actor)) return false;
    actor.inventory.remove('baitBarrel', 1);
    this.placeAt(actor.player.group.position, cardinalRotY(actor.player.group.rotation.y));
    this.audio.play('success');
    const fxPos = actor.player.group.position.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#9a6b3f', 10);
    return true;
  }

  private placeAt(position: THREE.Vector3, rotY: number): BaitBarrel {
    const barrel = new BaitBarrel(this.scene, position, rotY);
    this.barrels.push(barrel);
    const bp = barrel.group.position;
    this.onChanged?.({ op: 'add', id: this.ids.get(barrel), value: { id: this.ids.get(barrel), x: bp.x, y: bp.y, z: bp.z, rotY: barrel.group.rotation.y, foods: barrel.foods, bait: barrel.bait, tickLeft: barrel.tickLeft } });
    return barrel;
  }

  /** 把背包里该种类全部食物丢进身旁饵料桶(同种合并入队),返回是否丢入任何数量 */
  feed(actor: PlayerSession, kind: ResourceKind): boolean {
    const barrel = this.nearby(actor);
    const n = actor.inventory.count(kind);
    if (!barrel || n <= 0 || BAIT_YIELD[kind] === undefined) return false;
    actor.inventory.remove(kind, n);
    barrel.addFood(kind, n);
    this.emitState(barrel);
    this.audio.play('drop');
    return true;
  }

  /** 把身旁饵料桶里发酵好的鱼饵全部收回背包,返回是否收回任何数量 */
  collect(actor: PlayerSession): boolean {
    const barrel = this.nearby(actor);
    if (!barrel || barrel.bait <= 0) return false;
    const n = barrel.bait;
    barrel.bait = 0;
    this.emitState(barrel);
    this.give('bait', n, actor);
    this.audio.play('success');
    return true;
  }

  /** 每帧推进:权威端结算发酵,所有端推进桶口特效;客人端本地倒数只做表现 */
  update(delta: number, elapsed: number, authority: boolean): void {
    for (const barrel of this.barrels) {
      barrel.update(elapsed);
      if (!barrel.hasFood) {
        barrel.tickLeft = BAIT_CONVERT_INTERVAL;
        continue;
      }
      barrel.tickLeft -= delta;
      if (!authority || barrel.tickLeft > 0) continue;
      const food = barrel.foods[0];
      food.count -= 1;
      if (food.count <= 0) barrel.foods.shift();
      barrel.bait += BAIT_YIELD[food.kind] ?? 1;
      barrel.tickLeft += BAIT_CONVERT_INTERVAL;
      if (authority) {
        this.emitState(barrel);
        this.fx.burst(barrel.group.position.clone().setY(barrel.group.position.y + 0.7), '#d98c3f', 4);
      }
    }
  }

  /** 正在挖饵料桶 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.digStates.get(actor)?.digTarget;
  }

  /** 手持锄头站定在饵料桶旁自动挖掘,命中数次后整桶挖走(桶内食物与鱼饵一并回到背包/掉落);帧末统一提交持有的动作,挖掘结束自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      const p = actor.player.group.position;
      let target: BaitBarrel | null = null;
      if (actor.player.currentTool === 'hoe' && !actor.player.isSwimming && !this.isBusy(actor)) {
        for (const barrel of this.barrels) {
          this.scratch.copy(barrel.group.position);
          this.scratch.y = p.y;
          if (this.scratch.distanceTo(p) < DIG_RANGE) {
            target = barrel;
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
      this.fx.burst(target.group.position, '#9a6b3f', 6);
      st.hits += 1;
      if (st.hits < (actor.tools.hoe >= 2 ? 1 : DIG_HITS)) return;
      st.hits = 0;
      st.digTarget = null;
      this.barrels.splice(this.barrels.indexOf(target), 1);
      this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
      this.scene.remove(target.group);
      this.give('baitBarrel', 1, actor);
      for (const food of target.foods) this.give(food.kind, food.count, actor);
      if (target.bait > 0) this.give('bait', target.bait, actor);
      this.fx.burst(target.group.position, '#9a6b3f', 14);
    } finally {
      st.hold.commit(actor.player);
    }
  }

  /** 当前挖掘进度 0-1,未在挖掘时为 null */
  getDigProgress(actor: PlayerSession): number | null {
    const st = this.digStates.get(actor);
    if (!st?.digTarget) return null;
    const need = actor.tools.hoe >= 2 ? 1 : DIG_HITS;
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  /** 身旁饵料桶的状态快照(不在桶旁为 null) */
  nearbyInfo(actor: PlayerSession): BaitBarrelInfo | null {
    const barrel = this.nearby(actor);
    if (!barrel) return null;
    return {
      foods: barrel.foods.map((f) => ({ ...f })),
      bait: barrel.bait,
      progress: barrel.hasFood ? 1 - Math.max(barrel.tickLeft, 0) / BAIT_CONVERT_INTERVAL : 0,
    };
  }

  /** 当前所有饵料桶的存档快照(落点与桶内状态) */
  snapshot(): BaitBarrelSave[] {
    return this.barrels.map((barrel) => {
      const p = barrel.group.position;
      return { id: this.ids.get(barrel), x: p.x, y: p.y, z: p.z, rotY: barrel.group.rotation.y, foods: barrel.foods.map((f) => ({ ...f })), bait: barrel.bait, tickLeft: barrel.tickLeft };
    });
  }

  /** 清空场上全部饵料桶(客人侧重放世界快照前调用) */
  clear(): void {
    for (const barrel of this.barrels) this.scene.remove(barrel.group);
    this.barrels = [];
  }

  /** 从存档恢复全部饵料桶(含桶内食物与鱼饵) */
  restore(list: BaitBarrelSave[]): void {
    for (const b of list) {
      const barrel = new BaitBarrel(this.scene, new THREE.Vector3(b.x, b.y, b.z), b.rotY ?? 0);
      this.ids.set(barrel, b.id);
      barrel.foods = b.foods.map((f) => ({ ...f }));
      barrel.bait = b.bait;
      barrel.tickLeft = b.tickLeft;
      this.barrels.push(barrel);
    }
  }

  /** 桶内状态单独上报,网络层只下发变化字段 */
  private emitState(barrel: BaitBarrel): void {
    this.onChanged?.({
      op: 'set',
      id: this.ids.get(barrel),
      fields: { foods: barrel.foods.map((f) => ({ ...f })), bait: barrel.bait, tickLeft: barrel.tickLeft },
    });
  }

  /** 客人端按稳定 id 原地增删改 */
  netApply(list: BaitBarrelSave[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.barrels[i]))) continue;
      this.scene.remove(this.barrels[i].group);
      this.barrels.splice(i, 1);
    }
    const current = new Map(this.barrels.map((barrel) => [this.ids.get(barrel), barrel]));
    for (const value of list) {
      let barrel = value.id ? current.get(value.id) : undefined;
      if (!barrel) {
        barrel = new BaitBarrel(this.scene, new THREE.Vector3(value.x, value.y, value.z), value.rotY ?? 0);
        this.ids.set(barrel, value.id);
        this.barrels.push(barrel);
      }
      barrel.foods = value.foods.map((f) => ({ ...f }));
      barrel.bait = value.bait;
      barrel.tickLeft = value.tickLeft;
    }
  }
}
