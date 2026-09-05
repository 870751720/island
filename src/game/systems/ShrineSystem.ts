import * as THREE from 'three';
import { Shrine, SHRINE_COLORS, type ShrineKind } from '../entities/Shrine';
import type { ResourceKind } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { ActionHold } from './ActionHold';

const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处摆放
const SHRINE_BLOCK_RANGE = 1.2; // 与其他神像重叠距离小于该值时无处摆放
const DIG_RANGE = 1.6; // 持锄头可开挖神像的距离
const DIG_HITS = 2; // 锄头挖神像的命中次数(精致石锄 1 次)
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)
/** 波塞冬的祝福:每座神像降低的钓鱼杂物概率(百分点) */
export const SHRINE_JUNK_CUT = 1;
/** 光环类神龛(治愈水晶/雨神祭坛)的生效半径(米) */
export const SHRINE_AURA_RANGE = 30;

/** 存档/快照里的一座神龛;旧档缺 kind 时按波塞冬解释 */
export type ShrineSave = { id?: string; kind?: ShrineKind; x: number; y: number; z: number };

/** 每玩家的挖掘进度(神像是世界共享的) */
type PlayerSessionState = { hold: ActionHold; swingTimer: number; hits: number; digTarget: Shrine | null };

/**
 * 神龛系统(世界共享,按发起者 actor 结算,可放置多个):
 * 钓鱼稀世珍宝「使用」后放到脚下立起对应神龛;放置期间提供各自的全岛/光环祝福,
 * 手持锄头靠近站定可整座挖走,变回道具。
 * - 波塞冬的祝福:全岛钓鱼杂物概率降低
 * - 蜂巢神龛:全岛采集浆果丛时 10% 概率多掉 1 颗
 * - 治愈水晶:30 米内玩家缓慢回血
 * - 雨神祭坛:30 米内玩家饥渴值不再下降
 */
export class ShrineSystem {
  private shrines: Shrine[] = [];
  private scratch = new THREE.Vector3();
  private states = new Map<PlayerSession, PlayerSessionState>();
  private ids = new WorldEntityIds<Shrine>('shrine');
  private onChanged?: EntityChangeSink;
  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 挖走神像时道具入包(背包放不下的部分由该函数掉到地上) */
    private give: (kind: ResourceKind, count: number, actor: PlayerSession) => number,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isOtherBusy: (actor: PlayerSession) => boolean = () => false
  ) {}

  private st(actor: PlayerSession): PlayerSessionState {
    let st = this.states.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), swingTimer: 0, hits: 0, digTarget: null };
      this.states.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人进度 */
  detach(actor: PlayerSession): void {
    this.states.delete(actor);
  }

  /** 岛上是否放有波塞冬神像(祝福对全岛生效,多座不叠加) */
  get blessed(): boolean {
    return this.has('poseidonBlessing');
  }

  /** 钓鱼杂物概率的降低量(百分点,当前多座不叠加) */
  get junkCut(): number {
    return this.blessed ? SHRINE_JUNK_CUT : 0;
  }

  /** 蜂巢神龛是否在岛上(浆果丛产量祝福,全岛生效,多座不叠加) */
  get berryBlessed(): boolean {
    return this.has('beehiveShrine');
  }

  private has(kind: ShrineKind): boolean {
    return this.shrines.some((s) => s.kind === kind);
  }

  /** 位置是否处于某光环类神龛(治愈水晶/雨神祭坛)的半径内 */
  inAura(kind: 'healCrystal' | 'rainAltar', position: THREE.Vector3): boolean {
    for (const shrine of this.shrines) {
      if (shrine.kind !== kind) continue;
      this.scratch.copy(shrine.group.position);
      this.scratch.y = position.y;
      if (this.scratch.distanceTo(position) <= SHRINE_AURA_RANGE) return true;
    }
    return false;
  }

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点或其他神像占住) */
  private canPlace(actor: PlayerSession): boolean {
    const p = actor.player.group.position;
    if (actor.player.isSwimming) return false;
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= 0) return false;
    if (
      this.shrines.some((s) => {
        this.scratch.copy(s.group.position);
        return this.scratch.distanceTo(p) < SHRINE_BLOCK_RANGE;
      })
    ) {
      return false;
    }
    return !this.props.isOccupied(p, PROP_BLOCK_RANGE);
  }

  /** 背包里点击「使用」神龛道具:校验通过后在玩家脚下原地立起对应神像 */
  place(actor: PlayerSession, kind: ShrineKind): boolean {
    if (actor.inventory.count(kind) <= 0 || !this.canPlace(actor)) return false;
    actor.inventory.remove(kind, 1);
    const shrine = new Shrine(this.scene, actor.player.group.position, kind);
    this.shrines.push(shrine);
    const sp = shrine.group.position;
    const id = this.ids.get(shrine);
    this.onChanged?.({ op: 'add', id, value: { id, kind, x: sp.x, y: sp.y, z: sp.z } });
    this.audio.play('success');
    const fxPos = actor.player.group.position.clone();
    fxPos.y += 0.8;
    this.fx.burst(fxPos, SHRINE_COLORS[kind], 14);
    return true;
  }

  /** 每帧:神像宝石的常驻表现 */
  update(delta: number, elapsed: number): void {
    for (const shrine of this.shrines) shrine.update(delta, elapsed);
  }

  /** 每帧推进该玩家的挖掘;帧末统一提交持有的动作,挖掘结束自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
    const p = actor.player.group.position;
    let target: Shrine | null = null;
    if (
      actor.player.currentTool === 'hoe' &&
      !actor.player.isSwimming &&
      !this.isOtherBusy(actor)
    ) {
      for (const shrine of this.shrines) {
        this.scratch.copy(shrine.group.position);
        this.scratch.y = p.y;
        if (this.scratch.distanceTo(p) < DIG_RANGE) {
          target = shrine;
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
    this.fx.burst(target.group.position, '#8d99a6', 6);
    st.hits += 1;
    if (st.hits < (actor.tools.hoe >= 2 ? 1 : DIG_HITS)) return;
    st.hits = 0;
    st.digTarget = null;
    this.shrines.splice(this.shrines.indexOf(target), 1);
    this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
    this.scene.remove(target.group);
    this.give(target.kind, 1, actor);
    this.fx.burst(target.group.position, SHRINE_COLORS[target.kind], 14);
    } finally {
      st.hold.commit(actor.player);
    }
  }

  /** 正在挖神像 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.states.get(actor)?.digTarget;
  }

  /** 当前挖神像进度 0-1,未在挖掘时为 null */
  getDigProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st?.digTarget) return null;
    const need = actor.tools.hoe >= 2 ? 1 : DIG_HITS;
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  /** 当前所有神像的存档快照(种类与落点) */
  snapshot(): ShrineSave[] {
    return this.shrines.map((shrine) => {
      const p = shrine.group.position;
      return { id: this.ids.get(shrine), kind: shrine.kind, x: p.x, y: p.y, z: p.z };
    });
  }

  /** 清空场上全部神像(客人侧重放世界快照前调用) */
  clear(): void {
    for (const shrine of this.shrines) this.scene.remove(shrine.group);
    this.shrines = [];
  }

  /** 从存档恢复全部神像(旧档没有 kind,一律按波塞冬解释) */
  restore(list: ShrineSave[]): void {
    for (const s of list) {
      const kind = s.kind ?? 'poseidonBlessing';
      const shrine = new Shrine(this.scene, new THREE.Vector3(s.x, s.y, s.z), kind);
      this.ids.set(shrine, s.id);
      this.shrines.push(shrine);
    }
  }

  netApply(list: ShrineSave[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.shrines.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.shrines[i]))) continue;
      this.scene.remove(this.shrines[i].group);
      this.shrines.splice(i, 1);
    }
    const current = new Map(this.shrines.map((s) => [this.ids.get(s), s]));
    for (const value of list) {
      if (value.id && current.has(value.id)) continue;
      const shrine = new Shrine(this.scene, new THREE.Vector3(value.x, value.y, value.z), value.kind ?? 'poseidonBlessing');
      this.ids.set(shrine, value.id);
      this.shrines.push(shrine);
    }
  }
}
