import * as THREE from 'three';
import { PlaceOccupancy } from './PlaceOccupancy';
import { hoeHits } from './ToolTiers';
import { Crate, type CrateKind } from '../entities/Crate';
import type { InventorySlot, ResourceKind } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import { PROP_NAMES } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { cardinalRotY } from '../core/Facing';
import { ActionHold } from './ActionHold';

const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处摆放
const NEAR_RANGE = 2.2; // 玩家距木箱小于该值时算在木箱旁
const DIG_RANGE = 1.6; // 持锄头可开挖木箱的距离
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)

/** 每玩家的挖掘进度(世界里的木箱是共享的,进度各自算) */
type DigState = { hold: ActionHold; swingTimer: number; hits: number; digTarget: Crate | null };

/** 存取结果:ok 成功;empty 一侧已无该物品(连点已空格子,静默);full 对方装不下 */
export type TransferResult = 'ok' | 'empty' | 'full';

/** 木箱的存档/网络快照(落点、箱种与箱内格子;kind 缺省为木箱,兼容旧档) */
export type CrateSave = {
  id?: string;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  kind?: CrateKind;
  slots: InventorySlot[];
};

/**
 * 木箱系统(世界单实例,按发起者 actor 结算):
 * - 手持木箱道具站定后自动安放在面前格中心,校验通过后放下
 *   (与工作台摆放同一套规则:不能在水里/水边,落点不能被资源点或其他木箱占住);
 * - 手持锄头靠近木箱站定自动把整箱挖走(变回木箱道具,箱内物品回到背包/掉在身旁)。
 * 木箱自带 10 格、铁箱 20 格收纳,靠近后可整格存入背包物品或取回。
 */
export class CrateSystem {
  private crates: Crate[] = [];
  private scratch = new THREE.Vector3();
  private ids = new WorldEntityIds<Crate>('crate');
  private onChanged?: EntityChangeSink;

  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }
  private digStates = new Map<PlayerSession, DigState>();

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 挖走木箱时箱内物品入包(背包放不下的部分由该函数掉到地上) */
    private give: (kind: ResourceKind, count: number, actor: PlayerSession) => number,
    /** 统一安放占格判定:同格已被任何已放置实体占据时不可放 */
    private occupancy: PlaceOccupancy,
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

  /** 统一安放占格判定:该点同一格内是否有本系统放置的实体 */
  blocksCell(p: THREE.Vector3): boolean {
    return this.crates.some((e) => {
      this.scratch.copy(e.group.position);
      this.scratch.y = p.y;
      return this.scratch.distanceTo(p) < 1;
    });
  }

  canPlaceAt(actor: PlayerSession, x: number, z: number): string | null {
    const p = new THREE.Vector3(x, this.terrain.getHeight(x, z), z);
    if (actor.player.isSwimming) return '游泳时不能安放';
    if (this.terrain.isNearWater(p, 1)) return '离水太近';
    if (p.y <= 0) return '这里在水里';
    if (this.occupancy.taken(p)) return '这格已经放了东西';
    const blocker = this.props.occupant(p, PROP_BLOCK_RANGE);
    return blocker ? `被${PROP_NAMES[blocker]}挡住` : null;
  }

  /** 在吸附格中心放下木箱/铁箱(背包「使用」与手持自动安放共用入口) */
  use(actor: PlayerSession, kind: CrateKind, at: THREE.Vector3): boolean {
    if (actor.inventory.count(kind) <= 0 || !this.canPlaceAt(actor, at.x, at.z)) return false;
    actor.inventory.remove(kind, 1);
    const crate = new Crate(this.scene, at, kind, cardinalRotY(actor.player.group.rotation.y));
    this.crates.push(crate);
    const cp = crate.group.position;
    this.onChanged?.({ op: 'add', id: this.ids.get(crate), value: { id: this.ids.get(crate), x: cp.x, y: cp.y, z: cp.z, rotY: crate.group.rotation.y, kind: crate.kind, slots: crate.storage.snapshot() } });
    this.audio.play('success');
    const fxPos = cp.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, crate.color, 10);
    return true;
  }

  /** 在指定落点直接生成一个预填内容的木箱(波塞冬赠礼箱):不经过背包,绕过 canPlace,仅要求落点是干地 */
  spawnGift(x: number, z: number, kinds: readonly ResourceKind[]): Crate | null {
    if (this.terrain.getHeight(x, z) <= 0 || this.terrain.isNearWater(new THREE.Vector3(x, 0, z), 0)) return null;
    const crate = new Crate(this.scene, new THREE.Vector3(x, this.terrain.getHeight(x, z), z), 'crate', 0);
    for (const kind of kinds) crate.storage.add(kind, 1);
    crate.updateIcon();
    this.crates.push(crate);
    const cp = crate.group.position;
    this.onChanged?.({ op: 'add', id: this.ids.get(crate), value: { id: this.ids.get(crate), x: cp.x, y: cp.y, z: cp.z, rotY: crate.group.rotation.y, kind: crate.kind, slots: crate.storage.snapshot() } });
    return crate;
  }

  /** 帧更新:顶面内容标识自转 */
  update(delta: number): void {
    for (const crate of this.crates) crate.update(delta);
  }

  /** 正在挖木箱 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.digStates.get(actor)?.digTarget;
  }

  /** 手持锄头站定在木箱旁自动挖掘,命中数次后整箱挖走(箱内物品一并回到背包/掉落);帧末统一提交持有的动作,挖掘结束自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
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
    st.hold.hold(actor.player, 'mine');
    st.swingTimer += delta;
    if (st.swingTimer < SWING_TIME) return;
    st.swingTimer = 0;
    this.fx.burst(target.group.position, target.color, 6);
    st.hits += 1;
    if (st.hits < (hoeHits(actor.tools.hoe))) return;
    st.hits = 0;
    st.digTarget = null;
    this.crates.splice(this.crates.indexOf(target), 1);
    this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
    this.scene.remove(target.group);
    this.give(target.kind, 1, actor);
    for (const slot of target.storage.snapshot()) {
      if (slot) this.give(slot.kind, slot.count, actor);
    }
    this.fx.burst(target.group.position, target.color, 14);
    } finally {
      st.hold.commit(actor.player);
    }
  }

  /** 当前挖掘进度 0-1,未在挖掘时为 null */
  getDigProgress(actor: PlayerSession): number | null {
    const st = this.digStates.get(actor);
    if (!st?.digTarget) return null;
    const need = hoeHits(actor.tools.hoe);
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  /** 正在挖的箱种(未在挖掘为 null) */
  diggingKind(actor: PlayerSession): CrateKind | null {
    return this.digStates.get(actor)?.digTarget?.kind ?? null;
  }

  /** 身旁箱子的箱种(不在箱子旁为 null) */
  nearbyKind(actor: PlayerSession): CrateKind | null {
    return this.nearby(actor)?.kind ?? null;
  }

  /** 身旁木箱的格子快照(不在木箱旁为 null) */
  nearbySlots(actor: PlayerSession): InventorySlot[] | null {
    return this.nearby(actor)?.storage.snapshot() ?? null;
  }

  /** 身旁木箱的收纳格数(不在木箱旁为 null) */
  nearbyCapacity(actor: PlayerSession): number | null {
    return this.nearby(actor)?.storage.capacity ?? null;
  }

  /** 把背包里该种类道具存入身旁木箱(count 为 Infinity 时整格存入) */
  store(actor: PlayerSession, kind: ResourceKind, count = Infinity): TransferResult {
    const crate = this.nearby(actor);
    const n = Math.min(actor.inventory.count(kind), count);
    if (!crate || n <= 0) return 'empty';
    if (!crate.storage.canFit(kind)) return 'full';
    const before = crate.storage.snapshot();
    actor.inventory.remove(kind, n);
    crate.storage.add(kind, n);
    crate.updateIcon();
    this.emitSlotChanges(crate, before);
    this.audio.play('drop');
    return 'ok';
  }

  /** 把身旁木箱里该种类道具取回背包(count 为 Infinity 时整格取回) */
  take(actor: PlayerSession, kind: ResourceKind, count = Infinity): TransferResult {
    const crate = this.nearby(actor);
    const n = Math.min(crate ? crate.storage.count(kind) : 0, count);
    if (!crate || n <= 0) return 'empty';
    if (!actor.inventory.canFit(kind)) return 'full';
    const before = crate.storage.snapshot();
    crate.storage.remove(kind, n);
    crate.updateIcon();
    this.emitSlotChanges(crate, before);
    actor.inventory.add(kind, n);
    return 'ok';
  }

  /** 当前所有木箱的存档快照(落点、箱种与箱内内容) */
  snapshot(): CrateSave[] {
    return this.crates.map((crate) => {
      const p = crate.group.position;
      return { id: this.ids.get(crate), x: p.x, y: p.y, z: p.z, rotY: crate.group.rotation.y, kind: crate.kind, slots: crate.storage.snapshot() };
    });
  }

  /** 清空场上全部木箱(客人侧重放世界快照前调用) */
  clear(): void {
    for (const crate of this.crates) this.scene.remove(crate.group);
    this.crates = [];
  }

  /** 从存档恢复木箱(含箱内物品) */
  restore(list: CrateSave[]): void {
    for (const c of list) {
      const crate = new Crate(this.scene, new THREE.Vector3(c.x, c.y, c.z), c.kind ?? 'crate', c.rotY ?? 0);
      crate.storage.load(c.slots, crate.storage.capacity);
      crate.updateIcon();
      this.ids.set(crate, c.id);
      this.crates.push(crate);
    }
  }

  /** 槽位以路径字段单独上报，网络层无需重复发送整箱内容。 */
  private emitSlotChanges(crate: Crate, before: InventorySlot[]): void {
    const fields: Record<string, unknown> = {};
    crate.storage.snapshot().forEach((slot, index) => {
      if (JSON.stringify(slot) !== JSON.stringify(before[index])) fields[`slots.${index}`] = slot;
    });
    if (Object.keys(fields).length) this.onChanged?.({ op: 'set', id: this.ids.get(crate), fields });
  }

  /** 客人端按稳定 id 原地增删改；箱内格子变化只 reload 对应木箱。 */
  netApply(list: CrateSave[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.crates.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.crates[i]))) continue;
      this.scene.remove(this.crates[i].group);
      this.crates.splice(i, 1);
    }
    const current = new Map(this.crates.map((crate) => [this.ids.get(crate), crate]));
    for (const value of list) {
      let crate = value.id ? current.get(value.id) : undefined;
      if (!crate) {
        crate = new Crate(this.scene, new THREE.Vector3(value.x, value.y, value.z), value.kind ?? 'crate', value.rotY ?? 0);
        this.ids.set(crate, value.id);
        this.crates.push(crate);
      }
      crate.storage.load(value.slots, crate.storage.capacity);
      crate.updateIcon();
    }
  }
}
