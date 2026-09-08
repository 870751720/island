import * as THREE from 'three';
import { hoeHits } from './ToolTiers';
import { BrewBarrel } from '../entities/BrewBarrel';
import { BREWABLE, BREW_COST, BREW_INTERVAL } from './Wine';
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
const BARREL_BLOCK_RANGE = 0.8; // 与其他酿酒桶重叠距离小于该值时无处摆放
const NEAR_RANGE = 2.2; // 玩家距酿酒桶小于该值时算在桶旁
const DIG_RANGE = 1.6; // 持锄头可开挖酿酒桶的距离
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)

/** 酿酒桶存档/网络快照(落点 + 桶内原料与产出的酒) */
export type BrewBarrelSave = {
  id?: string;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  kind: ResourceKind | null;
  rawLeft: number;
  bottles: number;
  tickLeft: number;
};

/** 每玩家的挖掘进度(世界里的酿酒桶是共享的,进度各自算) */
type DigState = { hold: ActionHold; swingTimer: number; hits: number; digTarget: BrewBarrel | null };

/** 身旁酿酒桶的 HUD 快照 */
export type BrewBarrelInfo = {
  kind: ResourceKind | null;
  rawLeft: number;
  bottles: number;
  /** 当前一瓶的发酵进度 0-1(原料不足为 0) */
  progress: number;
};

/**
 * 酿酒桶系统(世界单实例,按发起者 actor 结算):
 * - 背包里点击「使用」酿酒桶,校验通过后在玩家脚下原地放下
 *   (不能在水里,脚下不能被资源点或其他酿酒桶占住,不要求水边);
 * - 靠近后可把背包里的原料丢进桶:一次只酿一种,桶被占用时只接受同种原料;
 *   每 45 秒把 2 个原料发酵成 1 瓶对应的酒,存放在桶内待收取;
 * - 手持锄头靠近站定自动整桶挖走(变回酿酒桶道具,桶内原料与酒一并回到背包/掉落)。
 * 发酵计时只在权威端(单机/房主)推进,客人端由世界增量回流并本地倒数做表现。
 */
export class BrewBarrelSystem {
  private barrels: BrewBarrel[] = [];
  private scratch = new THREE.Vector3();
  private ids = new WorldEntityIds<BrewBarrel>('brewBarrel');
  private onChanged?: EntityChangeSink;
  private digStates = new Map<PlayerSession, DigState>();

  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 收取的酒/挖回酿酒桶与桶内原料入包(背包放不下的部分由该函数掉到地上) */
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

  /** 玩家身旁最近的酿酒桶(范围内的),无则 null */
  nearby(actor: PlayerSession): BrewBarrel | null {
    let best: BrewBarrel | null = null;
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

  /** 指定格中心是否允许摆放(不在水里,格内没有被资源点或其他酿酒桶占住) */
  canPlaceAt(actor: PlayerSession, x: number, z: number): string | null {
    const p = new THREE.Vector3(x, this.terrain.getHeight(x, z), z);
    if (actor.player.isSwimming) return '游泳时不能安放';
    if (this.terrain.isNearWater(p, 1)) return '离水太近';
    if (p.y <= 0) return '这里在水里';
    if (
      this.barrels.some((barrel) => {
        this.scratch.copy(barrel.group.position);
        this.scratch.y = p.y;
        return this.scratch.distanceTo(p) < BARREL_BLOCK_RANGE;
      })
    ) {
      return '离其他酿酒桶太近';
    }
    return this.props.isOccupied(p, PROP_BLOCK_RANGE) ? '被资源点挡住' : null;
  }

  /** 在吸附格中心放下酿酒桶(背包「使用」与手持自动安放共用入口) */
  use(actor: PlayerSession, at: THREE.Vector3): boolean {
    if (actor.inventory.count('brewBarrel') <= 0 || !this.canPlaceAt(actor, at.x, at.z)) return false;
    actor.inventory.remove('brewBarrel', 1);
    const barrel = this.placeAt(at, cardinalRotY(actor.player.group.rotation.y));
    this.audio.play('success');
    const fxPos = barrel.group.position.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#6b4a2e', 10);
    return true;
  }

  private placeAt(position: THREE.Vector3, rotY: number): BrewBarrel {
    const barrel = new BrewBarrel(this.scene, position, rotY);
    this.barrels.push(barrel);
    const bp = barrel.group.position;
    this.onChanged?.({ op: 'add', id: this.ids.get(barrel), value: { id: this.ids.get(barrel), x: bp.x, y: bp.y, z: bp.z, rotY: barrel.group.rotation.y, kind: barrel.kind, rawLeft: barrel.rawLeft, bottles: barrel.bottles, tickLeft: barrel.tickLeft } });
    return barrel;
  }

  /** 把背包里该种类原料丢进身旁酿酒桶(count ≤ 0 为全部,桶被占用时只接受同种),返回是否丢入任何数量 */
  feed(actor: PlayerSession, kind: ResourceKind, count = 0): boolean {
    const barrel = this.nearby(actor);
    const n = Math.min(count > 0 ? count : Infinity, actor.inventory.count(kind));
    if (!barrel || n <= 0 || BREWABLE[kind] === undefined) return false;
    if (!barrel.addRaw(kind, n)) return false;
    actor.inventory.remove(kind, n);
    this.emitState(barrel);
    this.audio.play('drop');
    return true;
  }

  /** 把身旁酿酒桶里酿好的酒全部收回背包,返回是否收回任何数量 */
  collect(actor: PlayerSession): boolean {
    const barrel = this.nearby(actor);
    if (!barrel || barrel.kind === null || barrel.bottles <= 0) return false;
    const wine = BREWABLE[barrel.kind]!;
    const n = barrel.bottles;
    barrel.bottles = 0;
    if (!barrel.busy) barrel.kind = null;
    this.emitState(barrel);
    this.give(wine, n, actor);
    this.audio.play('success');
    return true;
  }

  /** 把身旁酿酒桶里还没发酵的原料取回背包,返回是否取回任何数量 */
  takeRaw(actor: PlayerSession): boolean {
    const barrel = this.nearby(actor);
    if (!barrel || barrel.kind === null || barrel.rawLeft <= 0) return false;
    const kind = barrel.kind;
    const n = barrel.rawLeft;
    barrel.rawLeft = 0;
    if (barrel.bottles <= 0) barrel.kind = null;
    barrel.tickLeft = BREW_INTERVAL;
    this.emitState(barrel);
    this.give(kind, n, actor);
    this.audio.play('pickup');
    return true;
  }

  /** 每帧推进:权威端结算发酵,所有端推进桶口特效;客人端本地倒数只做表现 */
  update(delta: number, elapsed: number, authority: boolean): void {
    for (const barrel of this.barrels) {
      barrel.update(elapsed);
      if (barrel.rawLeft < BREW_COST) {
        barrel.tickLeft = BREW_INTERVAL;
        continue;
      }
      barrel.tickLeft -= delta;
      if (!authority || barrel.tickLeft > 0) continue;
      barrel.rawLeft -= BREW_COST;
      if (barrel.rawLeft < BREW_COST) barrel.tickLeft = BREW_INTERVAL;
      else barrel.tickLeft += BREW_INTERVAL;
      barrel.bottles += 1;
      this.emitState(barrel);
      this.fx.burst(barrel.group.position.clone().setY(barrel.group.position.y + 0.75), '#b0496b', 4);
    }
  }

  /** 正在挖酿酒桶 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.digStates.get(actor)?.digTarget;
  }

  /** 手持锄头站定在酿酒桶旁自动挖掘,命中数次后整桶挖走(桶内原料与酒一并回到背包/掉落);帧末统一提交持有的动作,挖掘结束自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      const p = actor.player.group.position;
      let target: BrewBarrel | null = null;
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
      this.fx.burst(target.group.position, '#6b4a2e', 6);
      st.hits += 1;
      if (st.hits < (hoeHits(actor.tools.hoe))) return;
      st.hits = 0;
      st.digTarget = null;
      this.barrels.splice(this.barrels.indexOf(target), 1);
      this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
      this.scene.remove(target.group);
      this.give('brewBarrel', 1, actor);
      if (target.kind && target.rawLeft > 0) this.give(target.kind, target.rawLeft, actor);
      if (target.kind && target.bottles > 0) this.give(BREWABLE[target.kind] ?? target.kind, target.bottles, actor);
      this.fx.burst(target.group.position, '#6b4a2e', 14);
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

  /** 身旁酿酒桶的状态快照(不在桶旁为 null) */
  nearbyInfo(actor: PlayerSession): BrewBarrelInfo | null {
    const barrel = this.nearby(actor);
    if (!barrel) return null;
    return {
      kind: barrel.kind,
      rawLeft: barrel.rawLeft,
      bottles: barrel.bottles,
      progress: barrel.rawLeft >= BREW_COST ? 1 - Math.max(barrel.tickLeft, 0) / BREW_INTERVAL : 0,
    };
  }

  /** 当前所有酿酒桶的存档快照(落点与桶内状态) */
  snapshot(): BrewBarrelSave[] {
    return this.barrels.map((barrel) => {
      const p = barrel.group.position;
      return { id: this.ids.get(barrel), x: p.x, y: p.y, z: p.z, rotY: barrel.group.rotation.y, kind: barrel.kind, rawLeft: barrel.rawLeft, bottles: barrel.bottles, tickLeft: barrel.tickLeft };
    });
  }

  /** 清空场上全部酿酒桶(客人侧重放世界快照前调用) */
  clear(): void {
    for (const barrel of this.barrels) this.scene.remove(barrel.group);
    this.barrels = [];
  }

  /** 从存档恢复全部酿酒桶(含桶内原料与酒) */
  restore(list: BrewBarrelSave[]): void {
    for (const b of list) {
      const barrel = new BrewBarrel(this.scene, new THREE.Vector3(b.x, b.y, b.z), b.rotY ?? 0);
      this.ids.set(barrel, b.id);
      barrel.kind = b.kind;
      barrel.rawLeft = b.rawLeft;
      barrel.bottles = b.bottles;
      barrel.tickLeft = b.tickLeft;
      this.barrels.push(barrel);
    }
  }

  /** 桶内状态单独上报,网络层只下发变化字段 */
  private emitState(barrel: BrewBarrel): void {
    this.onChanged?.({
      op: 'set',
      id: this.ids.get(barrel),
      fields: { kind: barrel.kind, rawLeft: barrel.rawLeft, bottles: barrel.bottles, tickLeft: barrel.tickLeft },
    });
  }

  /** 客人端按稳定 id 原地增删改 */
  netApply(list: BrewBarrelSave[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.barrels[i]))) continue;
      this.scene.remove(this.barrels[i].group);
      this.barrels.splice(i, 1);
    }
    const current = new Map(this.barrels.map((barrel) => [this.ids.get(barrel), barrel]));
    for (const value of list) {
      const existed = value.id ? current.get(value.id) : undefined;
      let barrel = existed;
      if (!barrel) {
        barrel = new BrewBarrel(this.scene, new THREE.Vector3(value.x, value.y, value.z), value.rotY ?? 0);
        this.ids.set(barrel, value.id);
        this.barrels.push(barrel);
      }
      // 客人端补播:快照回流发现瓶数增加(房主已酿好一瓶)时本地放一次粒子,与房主端同款(初次同步的新桶不播)
      if (existed && value.bottles > barrel.bottles) {
        this.fx.burst(barrel.group.position.clone().setY(barrel.group.position.y + 0.75), '#b0496b', 4);
      }
      barrel.kind = value.kind;
      barrel.rawLeft = value.rawLeft;
      barrel.bottles = value.bottles;
      barrel.tickLeft = value.tickLeft;
    }
  }
}
