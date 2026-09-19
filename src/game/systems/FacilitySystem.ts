import { canFinishWork } from '../net/OwnerWork';
import { recoveryInteraction, type FacilityInteractionSource } from './FacilityInteraction';
import * as THREE from 'three';
import { PlaceOccupancy } from './PlaceOccupancy';
import { shovelHits } from './ToolTiers';
import type { Facility } from '../entities/Facility';
import type { ResourceKind } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { ActionHold } from './ActionHold';
import { dryCellReason } from './Facilities';

const DIG_RANGE = 1.6; // 持铲子可开挖设施的距离
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)
export type FacilitySave<K extends ResourceKind> = { id?: string; kind: K; x: number; y: number; z: number };
export type FacilityFactory<K extends ResourceKind> = {
  create(scene: THREE.Scene, position: THREE.Vector3, kind: K): Facility<K>;
  color(kind: K): string;
};

export type FacilityDependencies = {
  scene: THREE.Scene;
  terrain: IslandTerrain;
  props: Props;
  fx: Particles;
  give: (kind: ResourceKind, count: number, actor: PlayerSession) => number;
  occupancy: PlaceOccupancy;
  isOtherBusy?: (actor: PlayerSession) => boolean;
};

/** 每玩家的挖掘进度(设施是世界共享的) */
type PlayerSessionState<K extends ResourceKind> = { hold: ActionHold; swingTimer: number; hits: number; digTarget: Facility<K> | null };

/** 可整件回收的设施公共系统：占格、权威放置/回收、生命周期、存档和增量同步。 */
export class FacilitySystem<K extends ResourceKind> implements FacilityInteractionSource {
  protected facilities: Facility<K>[] = [];
  private scratch = new THREE.Vector3();
  private states = new Map<PlayerSession, PlayerSessionState<K>>();
  protected ids: WorldEntityIds<Facility<K>>;
  private onChanged?: EntityChangeSink;
  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }

  constructor(
    protected readonly dependencies: FacilityDependencies,
    private readonly factory: FacilityFactory<K>,
    readonly workKey: string
  ) { this.ids = new WorldEntityIds<Facility<K>>(workKey); }

  private st(actor: PlayerSession): PlayerSessionState<K> {
    let st = this.states.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), swingTimer: 0, hits: 0, digTarget: null };
      this.states.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人进度 */
  detach(actor: PlayerSession): void {
    this.states.get(actor)?.hold.commit(actor.player);
    this.states.delete(actor);
  }

  /** 统一安放占格判定:该点同一格内是否有本系统放置的实体 */
  blocksCell(p: THREE.Vector3): boolean {
    return this.facilities.some((e) => {
      this.scratch.copy(e.group.position);
      this.scratch.y = p.y;
      return this.scratch.distanceTo(p) < 1;
    });
  }

  canPlaceAt(actor: PlayerSession, x: number, z: number): string | null {
    return dryCellReason(actor, x, z, this.dependencies.terrain, this.dependencies.occupancy, this.dependencies.props);
  }

  /** 在吸附格中心立起对应设施(背包「使用」与手持自动安放共用入口) */
  place(actor: PlayerSession, kind: K, at: THREE.Vector3): boolean {
    if (actor.inventory.count(kind) <= 0 || this.canPlaceAt(actor, at.x, at.z) !== null) return false;
    actor.inventory.remove(kind, 1);
    const facility = this.factory.create(this.dependencies.scene, at, kind);
    this.facilities.push(facility);
    const sp = facility.group.position;
    const id = this.ids.get(facility);
    this.onChanged?.({ op: 'add', id, value: { id, kind, x: sp.x, y: sp.y, z: sp.z } });
    const fxPos = sp.clone();
    fxPos.y += 0.8;
    this.dependencies.fx.burst(fxPos, this.factory.color(kind), 14);
    return true;
  }

  /** 每帧:设施的常驻表现 */
  update(delta: number, elapsed: number): void {
    for (const facility of this.facilities) facility.update(delta, elapsed);
  }

  /** 每帧推进该玩家的挖掘;帧末统一提交持有的动作,挖掘结束自动释放 */
  settleDig(actor: PlayerSession, id: string): boolean {
    const target = this.facilities.find(item => this.ids.get(item) === id);
    if (!target || !canFinishWork(actor, target.group.position)) return false;
    if (actor.ownerWork) return actor.ownerWork.submit(this.workKey, id);
    this.facilities.splice(this.facilities.indexOf(target), 1);
    this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
    this.dependencies.scene.remove(target.group);
    target.dispose();
    this.dependencies.give(target.kind, 1, actor);
    this.dependencies.fx.burst(target.group.position, this.factory.color(target.kind), 14);

    return true;
  }

  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      const p = actor.player.group.position;
      let target: Facility<K> | null = null;
      if (
        actor.player.currentTool === 'shovel' &&
        !actor.player.isSwimming &&
        !this.dependencies.isOtherBusy?.(actor)
      ) {
        for (const facility of this.facilities) {
          this.scratch.copy(facility.group.position);
          this.scratch.y = p.y;
          if (this.scratch.distanceTo(p) < DIG_RANGE) {
            target = facility;
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
      if (st.digTarget !== target) { st.swingTimer = 0; st.hits = 0; }
      st.digTarget = target;
      st.hold.hold(actor.player, 'mine');
      st.swingTimer += delta;
      if (st.swingTimer < SWING_TIME) return;
      st.swingTimer = 0;
      this.dependencies.fx.burst(target.group.position, '#8d99a6', 6);
      st.hits += 1;
      if (st.hits < (shovelHits(actor.tools.shovel))) return;
      st.hits = 0;
      st.digTarget = null;
    this.settleDig(actor, this.ids.get(target));
    } finally {
      st.hold.commit(actor.player);
    }
  }

  /** 读取权威挖掘目标，供本地高亮与客人快照使用。 */
  getDigTarget(actor: PlayerSession): THREE.Object3D | null {
    return this.states.get(actor)?.digTarget?.group ?? null;
  }

  findDigVisual(x: number, z: number): THREE.Object3D | null {
    for (const item of this.facilities) {
      if (Math.abs(item.group.position.x - x) < 0.001 && Math.abs(item.group.position.z - z) < 0.001) return item.group;
    }
    return null;
  }

  diggingKind(actor: PlayerSession): K | null {
    return this.states.get(actor)?.digTarget?.kind ?? null;
  }

  isDigging(actor: PlayerSession): boolean {
    return !!this.states.get(actor)?.digTarget;
  }

  /** 当前挖设施进度 0-1,未在挖掘时为 null */
  getDigProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st?.digTarget) return null;
    const need = shovelHits(actor.tools.shovel);
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  /** 当前所有设施的存档快照(种类与落点) */
  snapshot(): FacilitySave<K>[] {
    return this.facilities.map((facility) => {
      const p = facility.group.position;
      return { id: this.ids.get(facility), kind: facility.kind, x: p.x, y: p.y, z: p.z };
    });
  }

  /** 清空场上全部设施(客人侧重放世界快照前调用) */
  clear(): void {
    for (const facility of this.facilities) {
      this.dependencies.scene.remove(facility.group);
      facility.dispose();
    }
    this.facilities = [];
    for (const actor of this.states.keys()) this.detach(actor);
  }

  /** 从存档恢复全部设施。 */
  restore(list: FacilitySave<K>[]): void {
    for (const s of list) {
      const facility = this.factory.create(this.dependencies.scene, new THREE.Vector3(s.x, s.y, s.z), s.kind);
      this.ids.set(facility, s.id);
      this.facilities.push(facility);
    }
  }

  netApply(list: FacilitySave<K>[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.facilities.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.facilities[i]))) continue;
      this.dependencies.scene.remove(this.facilities[i].group);
      this.facilities[i].dispose();
      this.facilities.splice(i, 1);
    }
    const current = new Map(this.facilities.map((s) => [this.ids.get(s), s]));
    for (const value of list) {
      if (value.id && current.has(value.id)) continue;
      const facility = this.factory.create(this.dependencies.scene, new THREE.Vector3(value.x, value.y, value.z), value.kind);
      this.ids.set(facility, value.id);
      this.facilities.push(facility);
    }
  }
  recoveryInteraction(actor: PlayerSession) {
    return recoveryInteraction(this, actor, this.diggingKind(actor), '拆');
  }

}
