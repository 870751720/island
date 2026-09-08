import * as THREE from 'three';
import { hoeHits } from './ToolTiers';
import { Loom } from '../entities/Loom';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { cardinalRotY } from '../core/Facing';
import { ActionHold } from './ActionHold';

const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处摆放
const LOOM_BLOCK_RANGE = 0.8; // 与其他纺织机重叠距离小于该值时无处摆放
const NEAR_RANGE = 2.2; // 玩家距纺织机小于该值时算在机旁
const DIG_RANGE = 1.6; // 持锄头可开挖纺织机的距离
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)

/** 每织 1 匹布料消耗 2 根绳线,耗时 6 秒 */
export const LOOM_ROPE_PER_CLOTH = 2;
export const LOOM_INTERVAL = 6;

/** 纺织机存档/网络快照(落点 + 机内绳线与布料存量) */
export type LoomSave = {
  id?: string;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  rope: number;
  cloth: number;
  tickLeft: number;
};

/** 每玩家的挖掘进度(世界里的纺织机是共享的,进度各自算) */
type DigState = { hold: ActionHold; swingTimer: number; hits: number; digTarget: Loom | null };

/** 身旁纺织机的 HUD 快照 */
export type LoomInfo = {
  rope: number;
  cloth: number;
  /** 当前织布进度 0-1(无绳线为 0) */
  progress: number;
};

/**
 * 纺织机系统(世界多实例,按发起者 actor 结算):
 * - 背包里点击「使用」纺织机,校验通过后在玩家脚下原地放下
 *   (与冶炼炉同一套摆放规则:不能在水里/水边,脚下不能被资源点或其他纺织机占住);
 * - 靠近后可把背包里的绳线丢进机:每 2 根绳线织出 1 匹布料,存放在机内待收取;
 * - 手持锄头靠近站定自动整机挖走(变回纺织机道具,机内绳线与布料一并回到背包/掉落)。
 * 织布计时只在权威端(单机/房主)推进,客人端由世界增量回流并本地倒数做表现。
 */
export class LoomSystem {
  private looms: Loom[] = [];
  private scratch = new THREE.Vector3();
  private ids = new WorldEntityIds<Loom>('loom');
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
    private give: (kind: 'rope' | 'cloth' | 'loom', count: number, actor: PlayerSession) => number,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isBusy: (actor: PlayerSession) => boolean = () => false
  ) {}

  /** 岛上已放置的纺织机数量 */
  get count(): number {
    return this.looms.length;
  }

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

  /** 玩家身旁最近的纺织机(范围内的),无则 null */
  nearby(actor: PlayerSession): Loom | null {
    let best: Loom | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const loom of this.looms) {
      this.scratch.copy(loom.group.position);
      this.scratch.y = actor.player.group.position.y;
      const d = this.scratch.distanceToSquared(actor.player.group.position);
      if (d < bestDist) {
        best = loom;
        bestDist = d;
      }
    }
    return best;
  }

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点或其他纺织机占住) */
  private canPlace(actor: PlayerSession): boolean {
    const p = actor.player.group.position;
    if (actor.player.isSwimming) return false;
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= 0) return false;
    if (
      this.looms.some((loom) => {
        this.scratch.copy(loom.group.position);
        return this.scratch.distanceTo(p) < LOOM_BLOCK_RANGE;
      })
    ) {
      return false;
    }
    return !this.props.isOccupied(p, PROP_BLOCK_RANGE);
  }

  /** 背包里点击「使用」纺织机:校验通过后在玩家脚下原地放下 */
  use(actor: PlayerSession): boolean {
    if (actor.inventory.count('loom') <= 0 || !this.canPlace(actor)) return false;
    actor.inventory.remove('loom', 1);
    this.placeAt(actor.player.group.position, cardinalRotY(actor.player.group.rotation.y));
    this.audio.play('success');
    const fxPos = actor.player.group.position.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#8a6239', 10);
    return true;
  }

  private placeAt(position: THREE.Vector3, rotY: number): Loom {
    const loom = new Loom(this.scene, position, rotY);
    this.looms.push(loom);
    const p = loom.group.position;
    this.onChanged?.({ op: 'add', id: this.ids.get(loom), value: { id: this.ids.get(loom), x: p.x, y: p.y, z: p.z, rotY: loom.group.rotation.y, rope: loom.rope, cloth: loom.cloth, tickLeft: loom.tickLeft } });
    return loom;
  }

  /** 把背包里的绳线丢进身旁纺织机(count ≤ 0 为全部),返回是否丢入任何数量 */
  feed(actor: PlayerSession, count = 0): boolean {
    const loom = this.nearby(actor);
    const n = Math.min(count > 0 ? count : Infinity, actor.inventory.count('rope'));
    if (!loom || n <= 0) return false;
    actor.inventory.remove('rope', n);
    loom.rope += n;
    this.emitState(loom);
    this.audio.play('drop');
    return true;
  }

  /** 把身旁纺织机里织好的布料全部收回背包,返回是否收回任何数量 */
  collect(actor: PlayerSession): boolean {
    const loom = this.nearby(actor);
    if (!loom || loom.cloth <= 0) return false;
    const n = loom.cloth;
    loom.cloth = 0;
    this.emitState(loom);
    this.give('cloth', n, actor);
    this.audio.play('success');
    return true;
  }

  /** 把身旁纺织机里还没织的绳线取回背包,返回是否取回任何数量 */
  takeRope(actor: PlayerSession): boolean {
    const loom = this.nearby(actor);
    if (!loom || loom.rope <= 0) return false;
    const n = loom.rope;
    loom.rope = 0;
    loom.tickLeft = LOOM_INTERVAL;
    this.emitState(loom);
    this.give('rope', n, actor);
    this.audio.play('pickup');
    return true;
  }

  /** 每帧推进:权威端结算织布,所有端推进梭子特效;客人端本地倒数只做表现 */
  update(delta: number, elapsed: number, authority: boolean): void {
    for (const loom of this.looms) {
      loom.update(elapsed);
      if (loom.rope < LOOM_ROPE_PER_CLOTH) {
        loom.tickLeft = LOOM_INTERVAL;
        continue;
      }
      loom.tickLeft -= delta;
      if (!authority || loom.tickLeft > 0) continue;
      loom.rope -= LOOM_ROPE_PER_CLOTH;
      loom.cloth += 1;
      loom.tickLeft += LOOM_INTERVAL;
      this.emitState(loom);
      this.fx.burst(loom.group.position.clone().setY(loom.group.position.y + 0.5), '#e8e2d4', 4);
    }
  }

  /** 正在挖纺织机 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.digStates.get(actor)?.digTarget;
  }

  /** 手持锄头站定在纺织机旁自动挖掘,命中数次后整机挖走(机内绳线与布料一并回到背包/掉落);帧末统一提交持有的动作,挖掘结束自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      const p = actor.player.group.position;
      let target: Loom | null = null;
      if (actor.player.currentTool === 'hoe' && !actor.player.isSwimming && !this.isBusy(actor)) {
        for (const loom of this.looms) {
          this.scratch.copy(loom.group.position);
          this.scratch.y = p.y;
          if (this.scratch.distanceTo(p) < DIG_RANGE) {
            target = loom;
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
      if (st.hits < (hoeHits(actor.tools.hoe))) return;
      st.hits = 0;
      st.digTarget = null;
      this.looms.splice(this.looms.indexOf(target), 1);
      this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
      this.scene.remove(target.group);
      this.give('loom', 1, actor);
      if (target.rope > 0) this.give('rope', target.rope, actor);
      if (target.cloth > 0) this.give('cloth', target.cloth, actor);
      this.fx.burst(target.group.position, '#8a6239', 14);
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

  /** 身旁纺织机的状态快照(不在机旁为 null) */
  nearbyInfo(actor: PlayerSession): LoomInfo | null {
    const loom = this.nearby(actor);
    if (!loom) return null;
    return {
      rope: loom.rope,
      cloth: loom.cloth,
      progress: loom.rope >= LOOM_ROPE_PER_CLOTH ? 1 - Math.max(loom.tickLeft, 0) / LOOM_INTERVAL : 0,
    };
  }

  /** 当前所有纺织机的存档快照(落点与机内状态) */
  snapshot(): LoomSave[] {
    return this.looms.map((loom) => {
      const p = loom.group.position;
      return { id: this.ids.get(loom), x: p.x, y: p.y, z: p.z, rotY: loom.group.rotation.y, rope: loom.rope, cloth: loom.cloth, tickLeft: loom.tickLeft };
    });
  }

  /** 清空场上全部纺织机(客人侧重放世界快照前调用) */
  clear(): void {
    for (const loom of this.looms) this.scene.remove(loom.group);
    this.looms = [];
  }

  /** 从存档恢复全部纺织机(含机内绳线与布料) */
  restore(list: LoomSave[]): void {
    for (const s of list) {
      const loom = new Loom(this.scene, new THREE.Vector3(s.x, s.y, s.z), s.rotY ?? 0);
      this.ids.set(loom, s.id);
      loom.rope = s.rope;
      loom.cloth = s.cloth;
      loom.tickLeft = s.tickLeft;
      this.looms.push(loom);
    }
  }

  /** 机内状态单独上报,网络层只下发变化字段 */
  private emitState(loom: Loom): void {
    this.onChanged?.({
      op: 'set',
      id: this.ids.get(loom),
      fields: { rope: loom.rope, cloth: loom.cloth, tickLeft: loom.tickLeft },
    });
  }

  /** 客人端按稳定 id 原地增删改 */
  netApply(list: LoomSave[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.looms.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.looms[i]))) continue;
      this.scene.remove(this.looms[i].group);
      this.looms.splice(i, 1);
    }
    const current = new Map(this.looms.map((loom) => [this.ids.get(loom), loom]));
    for (const value of list) {
      const existed = value.id ? current.get(value.id) : undefined;
      let loom = existed;
      if (!loom) {
        loom = new Loom(this.scene, new THREE.Vector3(value.x, value.y, value.z), value.rotY ?? 0);
        this.ids.set(loom, value.id);
        this.looms.push(loom);
      }
      // 客人端补播:快照回流发现布料增加(房主已织出一匹)时本地放一次粒子,与房主端同款(初次同步的新机不播)
      if (existed && value.cloth > loom.cloth) {
        this.fx.burst(loom.group.position.clone().setY(loom.group.position.y + 0.5), '#e8e2d4', 4);
      }
      loom.rope = value.rope;
      loom.cloth = value.cloth;
      loom.tickLeft = value.tickLeft;
    }
  }
}
