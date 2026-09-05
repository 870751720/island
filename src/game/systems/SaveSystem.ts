import type { InventorySlot, ResourceKind } from './Inventory';
import type { ToolId } from './Crafting';
import type { EquipKind, EquipSlot } from './Equipment';
import type { PropKind } from '../world/Props';
import type { TreeSpecies, TreeStage } from '../world/TreeSpecies';
import type { HandTool } from '../entities/Player';
import type { DropSource } from './DropSystem';
import type { ShrineSave } from './ShrineSystem';
import type { BaitBarrelSave } from './BaitBarrelSystem';

const SAVE_KEY = 'island.save.v1';
export const SAVE_VERSION = 29;

/** 资源点完整世界状态；所有资源都直接保存落点，不依赖种子复算布局。 */
export type PropSave = {
  id?: string;
  kind: PropKind;
  ready: boolean;
  /** 联机增量快照省略该字段(连续递减的数值不下发,客人不模拟再生) */
  regrowLeft?: number;
  stage?: 'full' | 'stump';
  species?: TreeSpecies;
  growth?: TreeStage;
  x: number;
  z: number;
  rotationY: number;
};

/** 一名玩家的会话进度(位置/生存/背包/工具/穿戴);联机时房主为每个远程玩家各存一份 */
export type SessionSave = {
  id: string;
  name: string;
  player: { x: number; y: number; z: number };
  survival: { hunger: number; thirst: number; health: number; stamina: number };
  slots: InventorySlot[];
  capacity: number;
  tools: Partial<Record<ToolId, number>>;
  equipped: Partial<Record<EquipSlot, EquipKind>>;
  handTool: HandTool;
};

/** 火堆/工作台/掉落物等摆件的落点(朝向仅上下左右四向,旧档缺省视为 0) */
export type PlacementSave = { id?: string; x: number; y: number; z: number; rotY?: number };

/** 完整存档:世界种子 + 玩家进度 */
export type SaveData = {
  version: number;
  id: string;
  name: string;
  terrainSeed: number;
  player: { x: number; y: number; z: number };
  survival: { hunger: number; thirst: number; health: number; stamina: number };
  slots: InventorySlot[];
  capacity: number;
  /** 已拥有的工具及其等级(0/未拥有不入档,1 基础,2 二级;制作一次永久拥有,不进背包) */
  tools: Partial<Record<ToolId, number>>;
  /** 各栏位已装备的道具(未装备的栏位缺省) */
  equipped: Partial<Record<EquipSlot, EquipKind>>;
  handTool: HandTool;
  dayTime: number;
  /** 当前是第几天(缺省视为第 1 天) */
  day?: number;
  props: PropSave[];
  campfires: (PlacementSave & { fuel: number })[];
  /** 场上所有工作台(落点与等级;可放置多个) */
  workbenches: (PlacementSave & { level: number })[];
  /** 本局是否已制作过工作台(制作卡片只在这局从未制作过时出现) */
  workbenchCrafted: boolean;
  /** 场上所有床(落点与等级;可放置多个) */
  beds: (PlacementSave & { level: number })[];
  /** 场上所有神龛(种类与落点;可放置多个,旧档缺 kind 时按波塞冬解释) */
  shrines?: ShrineSave[];
  /** 场上所有木箱(落点与箱内格子) */
  crates: (PlacementSave & { slots: InventorySlot[] })[];
  /** 场上所有饵料桶(落点与桶内食物/鱼饵,旧档缺省视为无) */
  baitBarrels?: BaitBarrelSave[];
  /** 场上所有围栏柱(格点坐标与种类),相邻柱自动连接 */
  fences: { id?: string; x: number; z: number; kind: 'wood' | 'stone' }[];
  /** 场上所有围栏门(所占格点边的起点与方向) */
  fenceGates: { id?: string; x: number; z: number; dir: 'x' | 'z' }[];
  drops: { id?: string; kind: ResourceKind; count: number; x: number; z: number; source: DropSource }[];
  /** 黑色博美伴侣的落点 */
  dog?: { x: number; z: number };
  /** 联机时房主保存的远程玩家会话(下标顺序与接入顺序一致;单机为空) */
  others?: SessionSave[];
};

/** localStorage 存档:定期自动写入,死亡清档,下次进入恢复 */
export const SaveSystem = {
  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      return data && data.version === SAVE_VERSION && Array.isArray(data.props) ? data : null;
    } catch {
      return null;
    }
  },

  save(data: SaveData): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // 存储不可用(隐私模式/已满)时静默放弃,不影响游玩
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // 忽略
    }
  },
};
