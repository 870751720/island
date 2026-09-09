import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { PlayerSession } from '../mp/PlayerSession';
import type { ResourceKind } from './Inventory';
import { ActionHold } from './ActionHold';
import { cardinalRotY } from '../core/Facing';
import type { FacilityDef, FacilityKind, FacilityTool } from './Facilities';

/** 安放网格与围栏共用同一整数格网(FENCE_GRID=1),落点取玩家面前一格吸附后的格中心 */
const PLACE_AHEAD = 0.9;
/** 手持设施站定自动放置的时长(秒,围栏门等可按定义覆盖) */
const AUTO_PLACE_TIME = 2;
/** 预览可用/不可用提示色 */
const PREVIEW_OK = '#7fd67f';
const PREVIEW_BAD = '#e06666';

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
  previewKind: FacilityKind | null;
  /** 工具循环切入时选中的设施道具 */
  selectedKind: ResourceKind | null;
  meshes: THREE.Mesh[];
  shownValid: boolean;
};

/**
 * 统一设施安放系统(世界单实例,按发起者 actor 结算):所有可放置道具(建筑/神龛/丛/围栏/门)
 * 在此注册一份 FacilityDef,即共用同一套行为——工具循环/选择面板入口、手持模型、
 * 面前吸附格绿/红幽灵预览、站定自动放置与背包「使用」就近放置。
 * 放置结算统一经 settle 回调走 Game 的权威入口(联机时自动上行房主),预览与进度两端各自本地驱动。
 */
export class AutoPlaceSystem {
  private defs = new Map<FacilityKind, FacilityDef>();
  private states = new Map<PlayerSession, SessionState>();
  private okMat = ghostMaterial(PREVIEW_OK);
  private badMat = ghostMaterial(PREVIEW_BAD);

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    /** 其他占用双手的行为(如合成/采集中),为真时安放让位 */
    private isBusy: (actor: PlayerSession) => boolean = () => false,
    /** 统一放置结算入口(由 Game 提供:失败提示、铲子收起等外围处理都在那边) */
    private settle: (kind: FacilityKind, actor: PlayerSession, cell: { x: number; z: number } | null) => boolean = () => false
  ) {}

  /** 注册一种可放置设施 */
  register(kind: FacilityKind, def: FacilityDef): void {
    this.defs.set(kind, def);
  }

  /** 该道具是否为已注册设施 */
  supports(kind: ResourceKind): boolean {
    return this.defs.has(kind);
  }

  /** 该设施手持时对应的工具位(未注册为 null) */
  toolOf(kind: ResourceKind): FacilityTool | null {
    return this.defs.get(kind)?.tool ?? null;
  }

  defOf(kind: FacilityKind): FacilityDef | undefined {
    return this.defs.get(kind);
  }

  /** 手持设施工具的背包剩余个数(工具按钮角标) */
  heldCount(actor: PlayerSession): number {
    const kind = this.heldKind(actor);
    return kind && kind !== 'soil' ? actor.inventory.count(kind) : 0;
  }

  /** 手持设施工具时选中的道具(未选中/已耗尽/工具不对为 null);
   * 工具驱动的零消耗设施(如锄头→土壤)直接按当前手持工具推导 */
  heldKind(actor: PlayerSession): FacilityKind | null {
    const tool = actor.player.currentTool;
    for (const [kind, def] of this.defs) {
      if (def.free && def.tool === tool && actor.tools[def.tool as keyof typeof actor.tools] > 0) return kind;
    }
    const kind = this.states.get(actor)?.selectedKind ?? null;
    if (!kind || !this.defs.has(kind)) return null;
    const def = this.defs.get(kind)!;
    if (!def.free && actor.inventory.count(kind) <= 0) return null;
    return def.tool === tool ? kind : null;
  }

  /** 某设施的预览/手持建模(真实材质,由外层接管材质或缩放) */
  previewModelOf(kind: FacilityKind): THREE.Object3D | null {
    const def = this.defs.get(kind);
    if (!def) return null;
    return (def.handModel ?? def.buildPreview)();
  }

  /**
   * 就近最优落点(默认策略):面前格附近一圈格中心里离面前最近的可放格;
   * 全都放不下时返回面前格与其不可放原因(红色预览与头顶提示用)。
   */
  target(actor: PlayerSession, kind: FacilityKind): { x: number; z: number; reason: string | null } {
    const def = this.defs.get(kind);
    const ahead = snapAheadCell(actor);
    if (!def?.valid) return { ...ahead, reason: null };
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

  /** 该设施的落点:自定义打分(围栏/门接线优先)优先,否则用默认就近搜索 */
  resolveTarget(actor: PlayerSession, kind: FacilityKind): { x: number; z: number; reason: string | null } {
    const def = this.defs.get(kind);
    return def?.target ? def.target(actor) : this.target(actor, kind);
  }

  /** 某设施对该玩家的站定放置时长(动态值按发起者取,缺省 2 秒) */
  private holdTimeOf(def: FacilityDef | undefined, actor: PlayerSession): number {
    if (!def?.holdTime) return AUTO_PLACE_TIME;
    return typeof def.holdTime === 'function' ? def.holdTime(actor) : def.holdTime;
  }

  private st(actor: PlayerSession): SessionState {
    let st = this.states.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), placeTimer: 0, lastPlaceX: null, preview: null, previewKind: null, selectedKind: null, meshes: [], shownValid: true };
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

  /** 工具循环切入某个设施道具(手动选中,不再取背包排最前的) */
  select(actor: PlayerSession, kind: ResourceKind): void {
    if (this.defs.has(kind)) this.st(actor).selectedKind = kind;
  }

  /** 正在安放放置中 */
  isPlacing(actor: PlayerSession): boolean {
    return (this.states.get(actor)?.placeTimer ?? 0) > 0;
  }

  /** 当前安放进度 0-1,未在放置时为 null */
  getPlaceProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st || st.placeTimer <= 0) return null;
    const kind = this.heldKind(actor);
    const need = kind ? this.holdTimeOf(this.defs.get(kind), actor) : AUTO_PLACE_TIME;
    return Math.min(st.placeTimer / need, 1);
  }

  /** 当前落点不可放的原因(可放或未手持为 null),红色预览时头顶显示 */
  placeReason(actor: PlayerSession): string | null {
    const kind = this.heldKind(actor);
    if (!kind) return null;
    return this.resolveTarget(actor, kind).reason;
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
    if (!kind || !def || (!def.free && actor.inventory.count(kind as ResourceKind) <= 0)) {
      st.placeTimer = 0;
      return;
    }
    const target = this.resolveTarget(actor, kind);
    const placeable =
      !actor.player.isMoving &&
      !actor.player.isSwimming &&
      !this.isBusy(actor) &&
      st.lastPlaceX === null &&
      target.reason === null;
    if (!placeable) {
      st.placeTimer = 0;
      return;
    }
    st.hold.hold(actor.player, 'craft');
    st.placeTimer += delta;
    if (st.placeTimer < this.holdTimeOf(def, actor)) return;
    st.placeTimer = 0;
    // 失败也记位,避免同一位置反复弹出失败提示;移动一下即恢复
    st.lastPlaceX = actor.player.group.position.x;
    this.settle(kind, actor, { x: target.x, z: target.z });
  }

  private updatePreview(actor: PlayerSession, st: SessionState): void {
    const kind = this.heldKind(actor);
    const def = kind ? this.defs.get(kind) : undefined;
    if (!kind || !def || actor.player.isSwimming || (!def.free && actor.inventory.count(kind as ResourceKind) <= 0)) {
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
    const target = this.resolveTarget(actor, kind);
    const valid = target.reason === null;
    if (valid !== st.shownValid) {
      st.shownValid = valid;
      for (const mesh of st.meshes) mesh.material = valid ? this.okMat : this.badMat;
    }
    st.preview.position.set(target.x, this.terrain.getHeight(target.x, target.z) - 0.03, target.z);
    st.preview.rotation.y = cardinalRotY(actor.player.group.rotation.y);
    def.onPreview?.(st.preview, actor, target.x, target.z);
    st.preview.visible = true;
  }
}

/** 把物体的真实建模缩到最大边约 0.3、居中到手心,作为手持模型 */
export function miniHeldModel(obj: THREE.Object3D): THREE.Object3D {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const scale = 0.3 / (Math.max(size.x, size.y, size.z) || 1);
  obj.scale.setScalar(scale);
  const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
  obj.position.set(-center.x, -center.y, -center.z);
  return obj;
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
