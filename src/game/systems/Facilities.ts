import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import { PROP_NAMES } from '../world/Props';
import type { PlaceOccupancy } from './PlaceOccupancy';
import type { PlayerSession } from '../mp/PlayerSession';

/** 设施手持时对应的工具位(工具循环/按钮分组) */
export type FacilityTool = 'place' | 'fence' | 'fenceGate';

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
  /** 权威放置(落格已由统一入口校验,只做入包扣除与实体生成) */
  place: (actor: PlayerSession, at: THREE.Vector3) => boolean;
  /** 站定自动放置的时长(秒,缺省 2;围栏门 5) */
  holdTime?: number;
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
