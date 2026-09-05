import * as THREE from 'three';
import { Smelter } from '../entities/Smelter';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { cardinalRotY } from '../core/Facing';
import { ActionHold } from './ActionHold';

const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处摆放
const SMELTER_BLOCK_RANGE = 0.8; // 与其他冶炼炉重叠距离小于该值时无处摆放
const NEAR_RANGE = 2.2; // 玩家距冶炼炉小于该值时算在炉旁
const DIG_RANGE = 1.6; // 持锄头可开挖冶炼炉的距离
const DIG_HITS = 2; // 锄头挖冶炼炉的命中次数(二级锄 1 次)
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)

/** 每 5 秒炼出 1 块铁锭 */
export const SMELT_INTERVAL = 5;
/** 炉内最多存放的铁矿石数 */
export const SMELTER_ORE_CAP = 20;

/** 冶炼炉存档/网络快照(落点 + 炉内矿石与铁锭存量) */
export type SmelterSave = {
  id?: string;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  ore: number;
  ingot: number;
  tickLeft: number;
};

/** 每玩家的挖掘进度(世界里的冶炼炉是共享的,进度各自算) */
type DigState = { hold: ActionHold; swingTimer: number; hits: number; digTarget: Smelter | null };

/** 身旁冶炼炉的 HUD 快照 */
export type SmelterInfo = {
  ore: number;
  ingot: number;
  /** 当前冶炼进度 0-1(无矿石为 0) */
  progress: number;
};

/**
 * 冶炼炉系统(世界多实例,按发起者 actor 结算):
 * - 背包里点击「使用」冶炼炉,校验通过后在玩家脚下原地放下
 *   (与木箱摆放同一套规则:不能在水里/水边,脚下不能被资源点或其他冶炼炉占住);
 * - 靠近后可把背包里的铁矿石丢进炉:每 5 秒炼出 1 块铁锭,存放在炉内待收取;
 * - 手持锄头靠近站定自动整炉挖走(变回冶炼炉道具,炉内矿石与铁锭一并回到背包/掉落)。
 * 冶炼计时只在权威端(单机/房主)推进,客人端由世界增量回流并本地倒数做表现。
 */
export class SmelterSystem {
  private smelters: Smelter[] = [];
  private scratch = new THREE.Vector3();
  private ids = new WorldEntityIds<Smelter>('smelter');
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
    private give: (kind: 'ironOre' | 'ironIngot' | 'smelter', count: number, actor: PlayerSession) => number,
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

  /** 玩家身旁最近的冶炼炉(范围内的),无则 null */
  nearby(actor: PlayerSession): Smelter | null {
    let best: Smelter | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const smelter of this.smelters) {
      this.scratch.copy(smelter.group.position);
      this.scratch.y = actor.player.group.position.y;
      const d = this.scratch.distanceToSquared(actor.player.group.position);
      if (d < bestDist) {
        best = smelter;
        bestDist = d;
      }
    }
    return best;
  }

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点或其他冶炼炉占住) */
  private canPlace(actor: PlayerSession): boolean {
    const p = actor.player.group.position;
    if (actor.player.isSwimming) return false;
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= 0) return false;
    if (
      this.smelters.some((smelter) => {
        this.scratch.copy(smelter.group.position);
        return this.scratch.distanceTo(p) < SMELTER_BLOCK_RANGE;
      })
    ) {
      return false;
    }
    return !this.props.isOccupied(p, PROP_BLOCK_RANGE);
  }

  /** 背包里点击「使用」冶炼炉:校验通过后在玩家脚下原地放下 */
  use(actor: PlayerSession): boolean {
    if (actor.inventory.count('smelter') <= 0 || !this.canPlace(actor)) return false;
    actor.inventory.remove('smelter', 1);
    this.placeAt(actor.player.group.position, cardinalRotY(actor.player.group.rotation.y));
    this.audio.play('success');
    const fxPos = actor.player.group.position.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#7d8288', 10);
    return true;
  }

  private placeAt(position: THREE.Vector3, rotY: number): Smelter {
    const smelter = new Smelter(this.scene, position, rotY);
    this.smelters.push(smelter);
    const sp = smelter.group.position;
    this.onChanged?.({ op: 'add', id: this.ids.get(smelter), value: { id: this.ids.get(smelter), x: sp.x, y: sp.y, z: sp.z, rotY: smelter.group.rotation.y, ore: smelter.ore, ingot: smelter.ingot, tickLeft: smelter.tickLeft } });
    return smelter;
  }

  /** 把背包里全部铁矿石丢进身旁冶炼炉,返回是否丢入任何数量 */
  feed(actor: PlayerSession): boolean {
    const smelter = this.nearby(actor);
    const n = actor.inventory.count('ironOre');
    if (!smelter || n <= 0) return false;
    if (smelter.ore + n > SMELTER_ORE_CAP) return false;
    actor.inventory.remove('ironOre', n);
    smelter.ore += n;
    this.emitState(smelter);
    this.audio.play('drop');
    return true;
  }

  /** 把身旁冶炼炉里炼好的铁锭全部收回背包,返回是否收回任何数量 */
  collect(actor: PlayerSession): boolean {
    const smelter = this.nearby(actor);
    if (!smelter || smelter.ingot <= 0) return false;
    const n = smelter.ingot;
    smelter.ingot = 0;
    this.emitState(smelter);
    this.give('ironIngot', n, actor);
    this.audio.play('success');
    return true;
  }

  /** 每帧推进:权威端结算冶炼,所有端推进炉门特效;客人端本地倒数只做表现 */
  update(delta: number, elapsed: number, authority: boolean): void {
    for (const smelter of this.smelters) {
      smelter.update(elapsed);
      if (smelter.ore <= 0) {
        smelter.tickLeft = SMELT_INTERVAL;
        continue;
      }
      smelter.tickLeft -= delta;
      if (!authority || smelter.tickLeft > 0) continue;
      smelter.ore -= 1;
      smelter.ingot += 1;
      smelter.tickLeft += SMELT_INTERVAL;
      this.emitState(smelter);
      this.fx.burst(smelter.group.position.clone().setY(smelter.group.position.y + 0.85), '#e8703a', 4);
    }
  }

  /** 正在挖冶炼炉 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.digStates.get(actor)?.digTarget;
  }

  /** 手持锄头站定在冶炼炉旁自动挖掘,命中数次后整炉挖走(炉内矿石与铁锭一并回到背包/掉落);帧末统一提交持有的动作,挖掘结束自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      const p = actor.player.group.position;
      let target: Smelter | null = null;
      if (actor.player.currentTool === 'hoe' && !actor.player.isSwimming && !this.isBusy(actor)) {
        for (const smelter of this.smelters) {
          this.scratch.copy(smelter.group.position);
          this.scratch.y = p.y;
          if (this.scratch.distanceTo(p) < DIG_RANGE) {
            target = smelter;
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
      this.fx.burst(target.group.position, '#7d8288', 6);
      st.hits += 1;
      if (st.hits < (actor.tools.hoe >= 2 ? 1 : DIG_HITS)) return;
      st.hits = 0;
      st.digTarget = null;
      this.smelters.splice(this.smelters.indexOf(target), 1);
      this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
      this.scene.remove(target.group);
      this.give('smelter', 1, actor);
      if (target.ore > 0) this.give('ironOre', target.ore, actor);
      if (target.ingot > 0) this.give('ironIngot', target.ingot, actor);
      this.fx.burst(target.group.position, '#7d8288', 14);
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

  /** 身旁冶炼炉的状态快照(不在炉旁为 null) */
  nearbyInfo(actor: PlayerSession): SmelterInfo | null {
    const smelter = this.nearby(actor);
    if (!smelter) return null;
    return {
      ore: smelter.ore,
      ingot: smelter.ingot,
      progress: smelter.ore > 0 ? 1 - Math.max(smelter.tickLeft, 0) / SMELT_INTERVAL : 0,
    };
  }

  /** 当前所有冶炼炉的存档快照(落点与炉内状态) */
  snapshot(): SmelterSave[] {
    return this.smelters.map((smelter) => {
      const p = smelter.group.position;
      return { id: this.ids.get(smelter), x: p.x, y: p.y, z: p.z, rotY: smelter.group.rotation.y, ore: smelter.ore, ingot: smelter.ingot, tickLeft: smelter.tickLeft };
    });
  }

  /** 清空场上全部冶炼炉(客人侧重放世界快照前调用) */
  clear(): void {
    for (const smelter of this.smelters) this.scene.remove(smelter.group);
    this.smelters = [];
  }

  /** 从存档恢复全部冶炼炉(含炉内矿石与铁锭) */
  restore(list: SmelterSave[]): void {
    for (const s of list) {
      const smelter = new Smelter(this.scene, new THREE.Vector3(s.x, s.y, s.z), s.rotY ?? 0);
      this.ids.set(smelter, s.id);
      smelter.ore = s.ore;
      smelter.ingot = s.ingot;
      smelter.tickLeft = s.tickLeft;
      this.smelters.push(smelter);
    }
  }

  /** 炉内状态单独上报,网络层只下发变化字段 */
  private emitState(smelter: Smelter): void {
    this.onChanged?.({
      op: 'set',
      id: this.ids.get(smelter),
      fields: { ore: smelter.ore, ingot: smelter.ingot, tickLeft: smelter.tickLeft },
    });
  }

  /** 客人端按稳定 id 原地增删改 */
  netApply(list: SmelterSave[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.smelters.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.smelters[i]))) continue;
      this.scene.remove(this.smelters[i].group);
      this.smelters.splice(i, 1);
    }
    const current = new Map(this.smelters.map((smelter) => [this.ids.get(smelter), smelter]));
    for (const value of list) {
      let smelter = value.id ? current.get(value.id) : undefined;
      if (!smelter) {
        smelter = new Smelter(this.scene, new THREE.Vector3(value.x, value.y, value.z), value.rotY ?? 0);
        this.ids.set(smelter, value.id);
        this.smelters.push(smelter);
      }
      smelter.ore = value.ore;
      smelter.ingot = value.ingot;
      smelter.tickLeft = value.tickLeft;
    }
  }
}
