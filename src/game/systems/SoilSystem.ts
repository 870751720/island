import * as THREE from 'three';
import { PlaceOccupancy } from './PlaceOccupancy';
import { shovelHits } from './ToolTiers';
import { Soil, type SoilSave } from '../entities/Soil';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { ActionHold } from './ActionHold';
import { dryCellReason } from './Facilities';

const DIG_RANGE = 1.6; // 持铲子可开挖土壤的距离
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)

/** 每玩家的挖掘进度(土壤是世界共享的) */
type PlayerSessionState = {
  hold: ActionHold;
  swingTimer: number;
  hits: number;
  digTarget: Soil | null;
  /** 正在挖的土壤上是否种着作物(先铲作物再挖土壤,提示文案用) */
  digTargetCrop: boolean;
};

/**
 * 土壤系统(世界共享,按发起者 actor 结算,可放置多个):
 * 手持锄头站定 2 秒(高等级锄头更快)即在面前空格开出土壤,零消耗;
 * 土壤占格(同格已被占/在水里即不可开),铲子靠近站定可挖掉还原,无掉落。
 * 后续种植系统在土壤格上播种。
 */
export class SoilSystem {
  private soils: Soil[] = [];
  private scratch = new THREE.Vector3();
  private states = new Map<PlayerSession, PlayerSessionState>();
  private ids = new WorldEntityIds<Soil>('soil');
  private onChanged?: EntityChangeSink;
  setChangeSink(sink?: EntityChangeSink): void {
    this.onChanged = sink;
  }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 统一安放占格判定:同格已被任何已放置实体占据时不可放 */
    private occupancy: PlaceOccupancy,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isOtherBusy: (actor: PlayerSession) => boolean = () => false,
    /** 该位置的土壤上是否种着作物(无副作用查询),与铲除回调都由 CropSystem 提供 */
    private hasCropAt: (x: number, z: number) => boolean = () => false,
    /** 铲掉该位置的作物(铲子优先铲作物,无掉落),返回是否铲掉了 */
    private removeCropAt: (x: number, z: number) => boolean = () => false
  ) {}

  private st(actor: PlayerSession): PlayerSessionState {
    let st = this.states.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), swingTimer: 0, hits: 0, digTarget: null, digTargetCrop: false };
      this.states.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人进度 */
  detach(actor: PlayerSession): void {
    this.states.delete(actor);
  }

  /** 统一安放占格判定:该点同一格内是否有本系统放置的实体 */
  blocksCell(p: THREE.Vector3): boolean {
    return this.soils.some((e) => {
      this.scratch.copy(e.group.position);
      this.scratch.y = p.y;
      return this.scratch.distanceTo(p) < 1;
    });
  }

  canPlaceAt(actor: PlayerSession, x: number, z: number): string | null {
    return dryCellReason(actor, x, z, this.terrain, this.occupancy, this.props);
  }

  /** 该格中心(水平距离 0.6 内)是否有土壤(播种校验用) */
  soilAt(x: number, z: number): boolean {
    return this.soils.some((soil) => {
      const p = soil.group.position;
      return Math.hypot(p.x - x, p.z - z) < 0.6;
    });
  }

  /** 在吸附格中心开出一格土壤(手持锄头自动安放的 place 委托,落格已校验,零消耗) */
  place(actor: PlayerSession, at: THREE.Vector3): boolean {
    if (this.canPlaceAt(actor, at.x, at.z) !== null) return false;
    const soil = new Soil(this.scene, at);
    this.soils.push(soil);
    const sp = soil.group.position;
    this.onChanged?.({ op: 'add', id: this.ids.get(soil), value: { id: this.ids.get(soil), x: sp.x, y: sp.y, z: sp.z } });
    this.audio.play('mine');
    const fxPos = sp.clone();
    fxPos.y += 0.3;
    this.fx.burst(fxPos, '#7d5c3e', 8);
    return true;
  }

  /** 每帧推进该玩家的挖掘;帧末统一提交持有的动作,挖掘结束自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      const p = actor.player.group.position;
      let target: Soil | null = null;
      if (
        actor.player.currentTool === 'shovel' &&
        !actor.player.isSwimming &&
        !this.isOtherBusy(actor)
      ) {
        for (const soil of this.soils) {
          this.scratch.copy(soil.group.position);
          this.scratch.y = p.y;
          if (this.scratch.distanceTo(p) < DIG_RANGE) {
            target = soil;
            break;
          }
        }
      }
      if (!target || actor.player.isMoving) {
        st.digTarget = null;
        st.digTargetCrop = false;
        st.swingTimer = 0;
        st.hits = 0;
        return;
      }
      st.digTarget = target;
      const tp0 = target.group.position;
      st.digTargetCrop = this.hasCropAt(tp0.x, tp0.z);
      st.hold.hold(actor.player, 'mine');
      st.swingTimer += delta;
      if (st.swingTimer < SWING_TIME) return;
      st.swingTimer = 0;
      this.fx.burst(target.group.position, '#7d5c3e', 6);
      st.hits += 1;
      if (st.hits < shovelHits(actor.tools.shovel)) return;
      st.hits = 0;
      st.digTarget = null;
      // 土壤上种着作物时先铲掉作物(无掉落),下一次挖完这格才移除土壤本身
      const tp = target.group.position;
      if (this.removeCropAt(tp.x, tp.z)) {
        st.digTargetCrop = false;
        this.fx.burst(new THREE.Vector3(tp.x, tp.y + 0.25, tp.z), '#7fae55', 8);
        this.audio.play('drop');
        return;
      }
      this.soils.splice(this.soils.indexOf(target), 1);
      this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
      this.scene.remove(target.group);
      this.audio.play('drop');
      // 铲开土壤偶尔翻出一颗漏收的红薯(极低概率彩蛋)
      if (Math.random() < 0.005) {
        actor.inventory.add('sweetPotatoSeed', 1);
        this.fx.burst(target.group.position.clone().setY(target.group.position.y + 0.3), '#c96a3a', 6);
      }
    } finally {
      st.hold.commit(actor.player);
    }
  }

  /** 正在挖土壤 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.states.get(actor)?.digTarget;
  }

  /** 正在挖的土壤上是否种着作物(先铲作物,提示文案用) */
  isDiggingCrop(actor: PlayerSession): boolean {
    const st = this.states.get(actor);
    return !!st?.digTarget && st.digTargetCrop;
  }

  /** 当前挖土壤进度 0-1,未在挖掘时为 null */
  getDigProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st?.digTarget) return null;
    const need = shovelHits(actor.tools.shovel);
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  /** 当前所有土壤的存档快照(落点) */
  snapshot(): SoilSave[] {
    return this.soils.map((soil) => {
      const p = soil.group.position;
      return { id: this.ids.get(soil), x: p.x, y: p.y, z: p.z };
    });
  }

  /** 清空场上全部土壤(客人侧重放世界快照前调用) */
  clear(): void {
    for (const soil of this.soils) this.scene.remove(soil.group);
    this.soils = [];
  }

  /** 从存档恢复全部土壤 */
  restore(list: SoilSave[]): void {
    for (const s of list) {
      const soil = new Soil(this.scene, new THREE.Vector3(s.x, s.y, s.z));
      this.ids.set(soil, s.id);
      this.soils.push(soil);
    }
  }

  netApply(list: SoilSave[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.soils.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.soils[i]))) continue;
      this.scene.remove(this.soils[i].group);
      this.soils.splice(i, 1);
    }
    const current = new Map(this.soils.map((s) => [this.ids.get(s), s]));
    for (const value of list) {
      if (value.id && current.has(value.id)) continue;
      const soil = new Soil(this.scene, new THREE.Vector3(value.x, value.y, value.z));
      this.ids.set(soil, value.id);
      this.soils.push(soil);
    }
  }
}
