import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import { PROP_NAMES } from '../world/Props';
import type { PlaceOccupancy } from './PlaceOccupancy';
import type { PlayerSession } from '../mp/PlayerSession';
import type { ResourceKind } from './Inventory';

/** 设施手持时对应的工具位(工具循环/按钮分组);hoe 为工具驱动:手持锄头即触发,不占背包道具 */
export type FacilityTool = 'place' | 'fence' | 'fenceGate' | 'hoe';

/** 落点预览可用/不可用提示色(安放系统幽灵模型与围栏预览补杆共用同一观感) */
export const PREVIEW_OK = '#7fd67f';
export const PREVIEW_BAD = '#e06666';

/** 半透明黏土幽灵材质(可用/不可用两种,改色即整体变色) */
export function previewGhostMaterial(color: string): THREE.MeshStandardMaterial {
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

/** 设施注册键:背包道具种类,或工具驱动的零消耗设施(如土壤) */
export type FacilityKind = ResourceKind | 'soil';

/**
 * 一种设施(可放置道具)的行为定义,注册进 AutoPlaceSystem 后统一获得:
 * 工具循环/长按选择面板入口、手持模型、绿/红落点预览、站定自动放置与背包「使用」放置。
 * 默认落点为面前 3x3 格内最近的可放格;需要特殊打分(围栏优先接线)时提供 target 覆盖。
 */
export interface FacilityDef {
  tool: FacilityTool;
  /** 位置校验(吸附格中心,返回 null=可放/否则为原因),默认落点搜索用 */
  valid?: (actor: PlayerSession, x: number, z: number) => string | null;
  /** 自定义落点(围栏/门优先接上现有围栏线时覆盖默认就近搜索) */
  target?: (actor: PlayerSession) => { x: number; z: number; reason: string | null };
  /** 幽灵预览与手持模型共用的建模(真实材质,由安放系统接管材质) */
  buildPreview: () => THREE.Object3D;
  /** 手持建模(缺省用 buildPreview 缩放) */
  handModel?: () => THREE.Object3D;
  /** 预览落位后的自定义刷新(围栏按邻居显隐横杆、门按方向转向) */
  onPreview?: (preview: THREE.Object3D, actor: PlayerSession, x: number, z: number) => void;
  /** 预览收起/切换道具时还原 onPreview 对世界做过的临时表现(如相邻围栏的预览补杆) */
  onPreviewHide?: () => void;
  /** 权威放置(落格已由统一入口校验,只做入包扣除与实体生成) */
  place: (actor: PlayerSession, at: THREE.Vector3) => boolean;
  /** 零消耗设施(工具驱动,如锄头开土壤):不检查/不扣除背包,持有对应工具即可放 */
  free?: boolean;
  /** 展示名(缺省取 ITEMS;非道具设施如土壤必须提供) */
  name?: string;
  /** 站定放置进行中的提示文案(缺省「安放:{name}…」;锄头开土壤用「锄地开垦…」更贴切) */
  placingLabel?: string;
  /** 站定自动放置的时长(秒,缺省 2;围栏门 5;可按发起者动态,如锄头等级越高越快) */
  holdTime?: number | ((actor: PlayerSession) => number);
  /** 落点可放但结算仍失败时的提示(缺省「这里放不下…」) */
  failText?: (actor: PlayerSession) => string;
}

/** 各设施系统共用的干地格校验:返回 null=可放,否则为不可放原因 */
export function dryCellReason(
  actor: PlayerSession,
  x: number,
  z: number,
  terrain: IslandTerrain,
  occupancy: PlaceOccupancy,
  props: Props,
  propRange = 1
): string | null {
  const p = new THREE.Vector3(x, terrain.getHeight(x, z), z);
  if (actor.player.isSwimming) return '游泳时不能安放';
  if (terrain.isNearWater(p, 1)) return '离水太近';
  if (p.y <= 0) return '这里在水里';
  if (occupancy.taken(p)) return '这格已经放了东西';
  const blocker = props.occupant(p, propRange);
  return blocker ? `被${PROP_NAMES[blocker]}挡住` : null;
}
