import * as THREE from 'three';
import { hoeHits } from './ToolTiers';
import { WaterPurifier } from '../entities/WaterPurifier';
import type { ResourceKind } from './Inventory';
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
const PURIFIER_BLOCK_RANGE = 0.8; // 与其他净化器重叠距离小于该值时无处摆放
const NEAR_RANGE = 2.2; // 玩家距净化器小于该值时算在净化器旁(可自动喝水)
const DIG_RANGE = 1.6; // 持锄头可开挖净化器的距离
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)
/** 距海线多远以内算湿沙滩(干地上摆放时的最大离海距离) */
const WET_BEACH_RANGE = 1.5;

/** 海水净化器存档/网络快照(落点) */
export type WaterPurifierSave = {
  id?: string;
  x: number;
  y: number;
  z: number;
  rotY?: number;
};

/** 每玩家的挖掘进度(世界里的净化器是共享的,进度各自算) */
type DigState = { hold: ActionHold; swingTimer: number; hits: number; digTarget: WaterPurifier | null };

/**
 * 海水净化器系统(世界单实例,按发起者 actor 结算):
 * - 背包里点击「使用」净化器,校验通过后在玩家脚下原地放下
 *   (只能放在湿沙滩:浅海涉水处或紧邻海线的沙滩,水洼边不算);
 * - 玩家靠近净化器站定后自动喝水(恢复口渴,由各端 WaterSystem 复用喝水动作);
 * - 手持锄头靠近站定自动挖走(变回净化器道具)。
 */
export class WaterPurifierSystem {
  private purifiers: WaterPurifier[] = [];
  private scratch = new THREE.Vector3();
  private ids = new WorldEntityIds<WaterPurifier>('waterPurifier');
  private onChanged?: EntityChangeSink;
  private digStates = new Map<PlayerSession, DigState>();

  setChangeSink(sink?: EntityChangeSink): void {
    this.onChanged = sink;
  }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 挖回的道具入包(背包放不下的部分由该函数掉到地上) */
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

  /** 玩家身旁最近的净化器(范围内的),无则 null */
  nearby(actor: PlayerSession): WaterPurifier | null {
    let best: WaterPurifier | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const purifier of this.purifiers) {
      this.scratch.copy(purifier.group.position);
      this.scratch.y = actor.player.group.position.y;
      const d = this.scratch.distanceToSquared(actor.player.group.position);
      if (d < bestDist) {
        best = purifier;
        bestDist = d;
      }
    }
    return best;
  }

  /** 指定落点是否是湿沙滩:浅海涉水处或紧邻海线的干沙滩;水洼边不算 */
  private onWetBeach(actor: PlayerSession, x: number, z: number): boolean {
    if (actor.player.isSwimming) return false;
    const kind = this.terrain.getWaterKind(x, z);
    if (kind === 'pond') return false;
    return kind === 'sea' || this.terrain.isNearSea(new THREE.Vector3(x, 0, z), WET_BEACH_RANGE);
  }

  /** 指定格中心是否允许摆放(在湿沙滩上,格内没有被资源点或其他净化器占住) */
  canPlaceAt(actor: PlayerSession, x: number, z: number): string | null {
    const p = new THREE.Vector3(x, this.terrain.getHeight(x, z), z);
    if (!this.onWetBeach(actor, x, z)) return '要放在海边湿沙滩上';
    if (
      this.purifiers.some((purifier) => {
        this.scratch.copy(purifier.group.position);
        this.scratch.y = p.y;
        return this.scratch.distanceTo(p) < PURIFIER_BLOCK_RANGE;
      })
    ) {
      return '离其他净化器太近';
    }
    const blocker = this.props.occupant(p, PROP_BLOCK_RANGE);
    return blocker ? `被${PROP_NAMES[blocker]}挡住` : null;
  }

  /** 在吸附格中心放下净化器(背包「使用」与手持自动安放共用入口) */
  use(actor: PlayerSession, at: THREE.Vector3): boolean {
    if (actor.inventory.count('waterPurifier') <= 0 || !this.canPlaceAt(actor, at.x, at.z)) return false;
    actor.inventory.remove('waterPurifier', 1);
    const purifier = new WaterPurifier(this.scene, at, cardinalRotY(actor.player.group.rotation.y));
    this.purifiers.push(purifier);
    const pp = purifier.group.position;
    this.onChanged?.({ op: 'add', id: this.ids.get(purifier), value: { id: this.ids.get(purifier), x: pp.x, y: pp.y, z: pp.z, rotY: purifier.group.rotation.y } });
    this.audio.play('success');
    const fxPos = pp.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#9aa3ab', 10);
    return true;
  }

  /** 每帧推进所有净化器的表现 */
  update(delta: number, elapsed: number): void {
    for (const purifier of this.purifiers) purifier.update(elapsed);
  }

  /** 正在挖净化器 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.digStates.get(actor)?.digTarget;
  }

  /** 手持锄头站定在净化器旁自动挖掘,命中数次后挖走(变回净化器道具);帧末统一提交持有的动作,挖掘结束自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      const p = actor.player.group.position;
      let target: WaterPurifier | null = null;
      if (actor.player.currentTool === 'hoe' && !actor.player.isSwimming && !this.isBusy(actor)) {
        for (const purifier of this.purifiers) {
          this.scratch.copy(purifier.group.position);
          this.scratch.y = p.y;
          if (this.scratch.distanceTo(p) < DIG_RANGE) {
            target = purifier;
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
      this.fx.burst(target.group.position, '#9aa3ab', 6);
      st.hits += 1;
      if (st.hits < hoeHits(actor.tools.hoe)) return;
      st.hits = 0;
      st.digTarget = null;
      this.purifiers.splice(this.purifiers.indexOf(target), 1);
      this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
      this.scene.remove(target.group);
      this.give('waterPurifier', 1, actor);
      this.fx.burst(target.group.position, '#9aa3ab', 14);
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

  /** 当前所有净化器的存档快照(落点) */
  snapshot(): WaterPurifierSave[] {
    return this.purifiers.map((purifier) => {
      const p = purifier.group.position;
      return { id: this.ids.get(purifier), x: p.x, y: p.y, z: p.z, rotY: purifier.group.rotation.y };
    });
  }

  /** 清空场上全部净化器(客人侧重放世界快照前调用) */
  clear(): void {
    for (const purifier of this.purifiers) this.scene.remove(purifier.group);
    this.purifiers = [];
  }

  /** 从存档恢复全部净化器 */
  restore(list: WaterPurifierSave[]): void {
    for (const s of list) {
      const purifier = new WaterPurifier(this.scene, new THREE.Vector3(s.x, s.y, s.z), s.rotY ?? 0);
      this.ids.set(purifier, s.id);
      this.purifiers.push(purifier);
    }
  }

  /** 客人端按稳定 id 原地增删 */
  netApply(list: WaterPurifierSave[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.purifiers.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.purifiers[i]))) continue;
      this.scene.remove(this.purifiers[i].group);
      this.purifiers.splice(i, 1);
    }
    for (const value of list) {
      if (value.id && this.purifiers.some((p) => this.ids.get(p) === value.id)) continue;
      const purifier = new WaterPurifier(this.scene, new THREE.Vector3(value.x, value.y, value.z), value.rotY ?? 0);
      this.ids.set(purifier, value.id);
      this.purifiers.push(purifier);
    }
  }
}
