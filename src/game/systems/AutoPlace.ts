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

/** 某道具的安放定义:位置校验(吸附格中心,返回 null=可放/否则为原因)、预览模型与执行放置(走原 Game.useXxx 入口) */
export type AutoPlaceDef = {
  valid: (actor: PlayerSession, x: number, z: number) => string | null;
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

/** 每玩家的安放状态:放置进度与落点幽灵预览(手持哪个道具由工具与背包实时推导) */
type SessionState = {
  hold: ActionHold;
  placeTimer: number;
  /** 原地自动放置是否已用过:null 表示可放,放置后记位,移动即复位 */
  lastPlaceX: number | null;
  preview: THREE.Group | null;
  previewKind: ResourceKind | null;
  meshes: THREE.Mesh[];
  shownValid: boolean;
};

/**
 * 通用「限定位置 + 自动安放」系统(世界单实例,按发起者 actor 结算):
 * 手持安放工具(工具按钮/循环切换切入)时取背包里排最前的可安放道具,
 * 面前吸附格中心常驻半透明预览(绿=可放、红=不可放并给出原因),
 * 附近有可放格时站定不动累计进度,走满后调用原放置入口(就近最优格优先);
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

  /** 背包里是否还有可安放道具(工具按钮与循环切换的持有判定,与当前手持无关) */
  anyHeld(actor: PlayerSession): boolean {
    return actor.inventory.snapshot().some((s) => s && this.defs.has(s.kind));
  }

  /** 手持安放道具的背包剩余个数(工具按钮角标) */
  heldCount(actor: PlayerSession): number {
    const kind = this.heldKind(actor);
    return kind ? actor.inventory.count(kind) : 0;
  }

  /** 手持安放工具时背包里排最前的可安放道具(工具不对或没道具为 null) */
  heldKind(actor: PlayerSession): ResourceKind | null {
    if (actor.player.currentTool !== 'place') return null;
    return actor.inventory.snapshot().find((s) => s && this.defs.has(s.kind))?.kind ?? null;
  }

  /**
   * 就近最优落点:面前格附近一圈格中心里离面前最近的可放格;
   * 全都放不下时返回面前格与其不可放原因(红色预览与头顶提示用)。
   */
  target(actor: PlayerSession, kind: ResourceKind): { x: number; z: number; reason: string | null } {
    const def = this.defs.get(kind);
    const ahead = snapAheadCell(actor);
    if (!def) return { ...ahead, reason: null };
    const p = actor.player.group.position;
    const rot = actor.player.group.rotation.y;
    const tx = p.x + Math.sin(rot) * PLACE_AHEAD;
    const tz = p.z + Math.cos(rot) * PLACE_AHEAD;
    let best: { x: number; z: number } | null = null;
    let bestDist = Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const x = ahead.x + dx;
        const z = ahead.z + dz;
        if (def.valid(actor, x, z) !== null) continue;
        const dist = Math.hypot(x - tx, z - tz);
        if (dist < bestDist) {
          bestDist = dist;
          best = { x, z };
        }
      }
    }
    if (best) return { ...best, reason: null };
    return { ...ahead, reason: def.valid(actor, ahead.x, ahead.z) };
  }

  /** 背包里点「使用」可安放道具:直接在就近最优格放下(与围栏的背包使用一致) */
  placeNow(kind: ResourceKind, actor: PlayerSession): boolean {
    const def = this.defs.get(kind);
    if (!def || actor.inventory.count(kind) <= 0) return false;
    return def.place(actor);
  }

  private st(actor: PlayerSession): SessionState {
    let st = this.states.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), placeTimer: 0, lastPlaceX: null, preview: null, previewKind: null, meshes: [], shownValid: true };
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

  /** 当前落点不可放的原因(可放或未手持为 null),红色预览时头顶显示 */
  placeReason(actor: PlayerSession): string | null {
    const kind = this.heldKind(actor);
    if (!kind) return null;
    return this.target(actor, kind).reason;
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
    const kind = this.heldKind(actor);
    const def = kind ? this.defs.get(kind) : undefined;
    if (!kind || !def || actor.inventory.count(kind) <= 0) {
      st.placeTimer = 0;
      return;
    }
    const placeable =
      !actor.player.isMoving &&
      !actor.player.isSwimming &&
      !this.isBusy(actor) &&
      st.lastPlaceX === null &&
      this.target(actor, kind).reason === null;
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
    const kind = this.heldKind(actor);
    const def = kind ? this.defs.get(kind) : undefined;
    if (!kind || !def || actor.player.isSwimming || actor.inventory.count(kind) <= 0) {
      if (st.preview) st.preview.visible = false;
      return;
    }
    if (!st.preview || st.previewKind !== kind) {
      if (st.preview) this.scene.remove(st.preview);
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
      st.previewKind = kind;
      st.preview.visible = false;
      st.shownValid = true;
      this.scene.add(st.preview);
    }
    const target = this.target(actor, kind);
    const valid = target.reason === null;
    if (valid !== st.shownValid) {
      st.shownValid = valid;
      for (const mesh of st.meshes) mesh.material = valid ? this.okMat : this.badMat;
    }
    st.preview.position.set(target.x, this.terrain.getHeight(target.x, target.z) - 0.03, target.z);
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
