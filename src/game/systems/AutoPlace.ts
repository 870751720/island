import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { PlayerSession } from '../mp/PlayerSession';
import type { ResourceKind } from './Inventory';
import { ActionHold } from './ActionHold';
import { cardinalRotY } from '../core/Facing';

/** 安放网格与围栏共用同一整数格网(FENCE_GRID=1),落点取玩家面前一格吸附后的格中心 */
const PLACE_AHEAD = 0.9;
/** 手持可安放道具站定自动放置的时长(秒) */
const AUTO_PLACE_TIME = 2;
/** 预览可用/不可用提示色 */
const PREVIEW_OK = '#7fd67f';
const PREVIEW_BAD = '#e06666';

/** 某道具的安放定义:位置校验(吸附格中心)、预览模型与执行放置(走原 Game.useXxx 入口) */
export type AutoPlaceDef = {
  valid: (actor: PlayerSession, x: number, z: number) => boolean;
  buildPreview: () => THREE.Object3D;
  place: (actor: PlayerSession) => boolean;
};

/** 玩家面前目标点吸附到最近整数格中心 */
export function snapAheadCell(actor: PlayerSession): { x: number; z: number } {
  const p = actor.player.group.position;
  const rot = actor.player.group.rotation.y;
  return {
    x: Math.round(p.x + Math.sin(rot) * PLACE_AHEAD),
    z: Math.round(p.z + Math.cos(rot) * PLACE_AHEAD),
  };
}

/** 用一次性场景构建幽灵预览模型(复用实体/资源点的真实建模逻辑),材质由安放系统统一接管 */
export function buildGhost(build: (scene: THREE.Scene) => THREE.Object3D): THREE.Object3D {
  const scratch = new THREE.Scene();
  const obj = build(scratch);
  scratch.remove(obj);
  obj.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });
  return obj;
}

/** 每玩家的安放状态:手持道具、放置进度与落点幽灵预览 */
type SessionState = {
  hold: ActionHold;
  kind: ResourceKind | null;
  placeTimer: number;
  /** 原地自动放置是否已用过:null 表示可放,放置后记位,移动即复位 */
  lastPlaceX: number | null;
  preview: THREE.Group | null;
  meshes: THREE.Mesh[];
  shownValid: boolean;
};

/**
 * 通用「限定位置 + 自动安放」系统(世界单实例,按发起者 actor 结算):
 * 背包里点「使用」可安放道具后进入手持安放模式,面前吸附格中心常驻半透明预览
 * (绿=可放、红=不可放),站定不动累计进度,走满后调用原放置入口;
 * 移动即复位,一次停止移动只放一个。放置结算始终走各系统原入口
 * (联机时 Game.useXxx 自动上行房主权威结算),预览与进度表现两端各自本地驱动。
 */
export class AutoPlaceSystem {
  private defs = new Map<ResourceKind, AutoPlaceDef>();
  private states = new Map<PlayerSession, SessionState>();
  private okMat = ghostMaterial(PREVIEW_OK);
  private badMat = ghostMaterial(PREVIEW_BAD);

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    /** 其他占用双手的行为(如合成/采集中),为真时安放让位 */
    private isBusy: (actor: PlayerSession) => boolean = () => false
  ) {}

  /** 注册一种可安放道具 */
  register(kind: ResourceKind, def: AutoPlaceDef): void {
    this.defs.set(kind, def);
  }

  /** 该道具是否支持安放模式 */
  supports(kind: ResourceKind): boolean {
    return this.defs.has(kind);
  }

  private st(actor: PlayerSession): SessionState {
    let st = this.states.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), kind: null, placeTimer: 0, lastPlaceX: null, preview: null, meshes: [], shownValid: true };
      this.states.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其安放进度与预览 */
  detach(actor: PlayerSession): void {
    const st = this.states.get(actor);
    if (!st) return;
    if (st.preview) this.scene.remove(st.preview);
    this.states.delete(actor);
  }

  /** 进入/退出安放模式(kind 为 null 时退出) */
  hold(actor: PlayerSession, kind: ResourceKind | null): void {
    const st = this.st(actor);
    if (kind !== null && !this.defs.has(kind)) kind = null;
    if (st.kind === kind) return;
    st.kind = kind;
    st.placeTimer = 0;
    st.lastPlaceX = null;
    if (st.preview) {
      this.scene.remove(st.preview);
      st.preview = null;
      st.meshes = [];
    }
  }

  /** 当前手持安放中的道具(未在安放为 null) */
  heldKind(actor: PlayerSession): ResourceKind | null {
    return this.states.get(actor)?.kind ?? null;
  }

  /** 正在安放放置中 */
  isPlacing(actor: PlayerSession): boolean {
    return (this.states.get(actor)?.placeTimer ?? 0) > 0;
  }

  /** 当前安放进度 0-1,未在放置时为 null */
  getPlaceProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st || st.placeTimer <= 0) return null;
    return Math.min(st.placeTimer / AUTO_PLACE_TIME, 1);
  }

  /** 权威端每帧推进该玩家:落点预览 + 站定自动放置;帧末统一提交持有的动作 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      this.updatePreview(actor, st);
      this.updateAutoPlace(actor, st, delta);
    } finally {
      st.hold.commit(actor.player);
    }
  }

  /** 客人端表现驱动:只刷新该玩家的落点预览,放置仍由房主权威结算 */
  updatePreviewFor(actor: PlayerSession): void {
    this.updatePreview(actor, this.st(actor));
  }

  private updateAutoPlace(actor: PlayerSession, st: SessionState, delta: number): void {
    // 移动即恢复自动放置资格(原地只放一次;挪过步再回来也能放)
    if (actor.player.isMoving) st.lastPlaceX = null;
    const def = st.kind ? this.defs.get(st.kind) : undefined;
    if (!def || !st.kind || actor.inventory.count(st.kind) <= 0) {
      if (st.kind && (!def || actor.inventory.count(st.kind) <= 0)) this.hold(actor, null);
      st.placeTimer = 0;
      return;
    }
    const cell = snapAheadCell(actor);
    const placeable =
      !actor.player.isMoving &&
      !actor.player.isSwimming &&
      !this.isBusy(actor) &&
      st.lastPlaceX === null &&
      def.valid(actor, cell.x, cell.z);
    if (!placeable) {
      st.placeTimer = 0;
      return;
    }
    st.hold.hold(actor.player, 'craft');
    st.placeTimer += delta;
    if (st.placeTimer < AUTO_PLACE_TIME) return;
    st.placeTimer = 0;
    // 失败也记位,避免同一位置反复弹出失败提示;移动一下即恢复
    st.lastPlaceX = actor.player.group.position.x;
    def.place(actor);
  }

  private updatePreview(actor: PlayerSession, st: SessionState): void {
    const def = st.kind ? this.defs.get(st.kind) : undefined;
    if (!def || !st.kind || actor.player.isSwimming || actor.inventory.count(st.kind) <= 0) {
      if (st.preview) st.preview.visible = false;
      if (st.kind && actor.inventory.count(st.kind) <= 0) this.hold(actor, null);
      return;
    }
    if (!st.preview) {
      const model = def.buildPreview();
      st.meshes = [];
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.material = this.okMat;
          st.meshes.push(mesh);
        }
      });
      st.preview = new THREE.Group();
      st.preview.add(model);
      st.preview.visible = false;
      this.scene.add(st.preview);
    }
    const cell = snapAheadCell(actor);
    const valid = def.valid(actor, cell.x, cell.z);
    if (valid !== st.shownValid) {
      st.shownValid = valid;
      for (const mesh of st.meshes) mesh.material = valid ? this.okMat : this.badMat;
    }
    st.preview.position.set(cell.x, this.terrain.getHeight(cell.x, cell.z) - 0.03, cell.z);
    st.preview.rotation.y = cardinalRotY(actor.player.group.rotation.y);
    st.preview.visible = true;
  }
}

/** 半透明黏土幽灵材质(可用/不可用两种,改色即整体变色) */
function ghostMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.7,
    flatShading: true,
    roughness: 1,
    depthWrite: false,
  });
}
