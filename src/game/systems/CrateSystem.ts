import * as THREE from 'three';
import { Crate } from '../entities/Crate';
import type { InventorySlot, ResourceKind } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';

const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处摆放
const CRATE_BLOCK_RANGE = 0.8; // 与其他木箱/重叠距离小于该值时无处摆放
const NEAR_RANGE = 2.2; // 玩家距木箱小于该值时算在木箱旁
const DIG_RANGE = 1.6; // 持锄头可开挖木箱的距离
const DIG_HITS = 2; // 锄头挖木箱的命中次数(精致石锄 1 次)
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)

/** 每玩家的挖掘进度(世界里的木箱是共享的,进度各自算) */
type DigState = { swingTimer: number; hits: number; digTarget: Crate | null };

/**
 * 木箱系统(世界单实例,按发起者 actor 结算):
 * - 背包里点击「使用」木箱,校验通过后在玩家脚下原地放下
 *   (与工作台摆放同一套规则:不能在水里/水边,脚下不能被资源点或其他木箱占住);
 * - 手持锄头靠近木箱站定自动把整箱挖走(变回木箱道具,箱内物品回到背包/掉在身旁)。
 * 木箱自带 10 格收纳,靠近后可整格存入背包物品或取回。
 */
export class CrateSystem {
  private crates: Crate[] = [];
  private scratch = new THREE.Vector3();
  private digStates = new Map<PlayerSession, DigState>();

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 挖走木箱时箱内物品入包(背包放不下的部分由该函数掉到地上) */
    private give: (kind: ResourceKind, count: number, actor: PlayerSession) => number,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isBusy: (actor: PlayerSession) => boolean = () => false
  ) {}

  private st(actor: PlayerSession): DigState {
    let st = this.digStates.get(actor);
    if (!st) {
      st = { swingTimer: 0, hits: 0, digTarget: null };
      this.digStates.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人挖掘进度 */
  detach(actor: PlayerSession): void {
    this.digStates.delete(actor);
  }

  /** 玩家身旁最近的木箱(范围内的),无则 null */
  nearby(actor: PlayerSession): Crate | null {
    let best: Crate | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const crate of this.crates) {
      this.scratch.copy(crate.group.position);
      this.scratch.y = actor.player.group.position.y;
      const d = this.scratch.distanceToSquared(actor.player.group.position);
      if (d < bestDist) {
        best = crate;
        bestDist = d;
      }
    }
    return best;
  }

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点或其他木箱占住) */
  private canPlace(actor: PlayerSession): boolean {
    const p = actor.player.group.position;
    if (actor.player.isSwimming) return false;
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= 0) return false;
    if (
      this.crates.some((crate) => {
        this.scratch.copy(crate.group.position);
        return this.scratch.distanceTo(p) < CRATE_BLOCK_RANGE;
      })
    ) {
      return false;
    }
    return !this.props.isOccupied(p, PROP_BLOCK_RANGE);
  }

  /** 背包里点击「使用」木箱:校验通过后在玩家脚下原地放下 */
  use(actor: PlayerSession): boolean {
    if (actor.inventory.count('crate') <= 0 || !this.canPlace(actor)) return false;
    actor.inventory.remove('crate', 1);
    this.crates.push(new Crate(this.scene, actor.player.group.position));
    this.audio.play('success');
    const fxPos = actor.player.group.position.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#a97b48', 10);
    return true;
  }

  /** 正在挖木箱 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.digStates.get(actor)?.digTarget;
  }

  /** 手持锄头站定在木箱旁自动挖掘,命中数次后整箱挖走(箱内物品一并回到背包/掉落) */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    const p = actor.player.group.position;
    const holding = actor.player.currentTool === 'hoe';
    let target: Crate | null = null;
    if (holding && !actor.player.isSwimming && !this.isBusy(actor)) {
      for (const crate of this.crates) {
        this.scratch.copy(crate.group.position);
        this.scratch.y = p.y;
        if (this.scratch.distanceTo(p) < DIG_RANGE) {
          target = crate;
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
    actor.player.setAction('mine');
    st.swingTimer += delta;
    if (st.swingTimer < SWING_TIME) return;
    st.swingTimer = 0;
    this.fx.burst(target.group.position, '#a97b48', 6);
    st.hits += 1;
    if (st.hits < (actor.tools.hoe >= 2 ? 1 : DIG_HITS)) return;
    st.hits = 0;
    st.digTarget = null;
    this.crates.splice(this.crates.indexOf(target), 1);
    this.scene.remove(target.group);
    this.give('crate', 1, actor);
    for (const slot of target.storage.snapshot()) {
      if (slot) this.give(slot.kind, slot.count, actor);
    }
    this.audio.play('pickup');
    this.fx.burst(target.group.position, '#a97b48', 14);
  }

  /** 当前挖掘进度 0-1,未在挖掘时为 null */
  getDigProgress(actor: PlayerSession): number | null {
    const st = this.digStates.get(actor);
    if (!st?.digTarget) return null;
    const need = actor.tools.hoe >= 2 ? 1 : DIG_HITS;
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  /** 身旁木箱的格子快照(不在木箱旁为 null) */
  nearbySlots(actor: PlayerSession): InventorySlot[] | null {
    return this.nearby(actor)?.storage.snapshot() ?? null;
  }

  /** 把背包里该种类全部道具整格存入身旁木箱,返回是否存入任何数量 */
  store(actor: PlayerSession, kind: ResourceKind): boolean {
    const crate = this.nearby(actor);
    const n = actor.inventory.count(kind);
    if (!crate || n <= 0 || !crate.storage.canFit(kind)) return false;
    actor.inventory.remove(kind, n);
    crate.storage.add(kind, n);
    this.audio.play('drop');
    return true;
  }

  /** 把身旁木箱里该种类全部道具整格取回背包,返回是否取回任何数量 */
  take(actor: PlayerSession, kind: ResourceKind): boolean {
    const crate = this.nearby(actor);
    const n = crate ? crate.storage.count(kind) : 0;
    if (!crate || n <= 0 || !actor.inventory.canFit(kind)) return false;
    crate.storage.remove(kind, n);
    actor.inventory.add(kind, n);
    this.audio.play('pickup');
    return true;
  }

  /** 当前所有木箱的存档快照(落点与 10 格内容) */
  snapshot(): { x: number; y: number; z: number; slots: InventorySlot[] }[] {
    return this.crates.map((crate) => {
      const p = crate.group.position;
      return { x: p.x, y: p.y, z: p.z, slots: crate.storage.snapshot() };
    });
  }

  /** 清空场上全部木箱(客人侧重放世界快照前调用) */
  clear(): void {
    for (const crate of this.crates) this.scene.remove(crate.group);
    this.crates = [];
  }

  /** 从存档恢复木箱(含箱内物品) */
  restore(
    list: { x: number; y: number; z: number; slots: InventorySlot[] }[]
  ): void {
    for (const c of list) {
      const crate = new Crate(this.scene, new THREE.Vector3(c.x, c.y, c.z));
      crate.storage.load(c.slots);
      this.crates.push(crate);
    }
  }
}
