import type { InventorySlot, ResourceKind } from './Inventory';
import type { ToolId } from './Crafting';
import type { EquipKind, EquipSlot } from './Equipment';
import type { PropKind } from '../world/Props';
import type { TreeSpecies, TreeStage } from '../world/TreeSpecies';
import type { HandTool } from '../entities/Player';
import type { DropSource } from './DropSystem';

const SAVE_KEY = 'island.save.v1';
export const SAVE_VERSION = 13;

/** 资源点可恢复状态(自然生成的与 Props.list 前段一一对应,布局由种子保证一致;玩家种下的树带坐标) */
export type PropSave = {
  kind: PropKind;
  ready: boolean;
  regrowLeft: number;
  stage?: 'full' | 'stump';
  species?: TreeSpecies;
  growth?: TreeStage;
  /** 玩家种下的树的落点坐标;自然生成的资源点没有该字段 */
  x?: number;
  z?: number;
};

/** 火堆/工作台/掉落物等摆件的落点 */
export type PlacementSave = { x: number; y: number; z: number };

/** 完整存档:世界种子 + 玩家进度 */
export type SaveData = {
  version: number;
  terrainSeed: number;
  propsSeed: number;
  player: { x: number; y: number; z: number };
  survival: { hunger: number; thirst: number; health: number; stamina: number };
  slots: InventorySlot[];
  capacity: number;
  /** 已拥有的工具及其等级(0/未拥有不入档,1 基础,2 精致;制作一次永久拥有,不进背包) */
  tools: Partial<Record<ToolId, number>>;
  /** 各栏位已装备的道具(未装备的栏位缺省) */
  equipped: Partial<Record<EquipSlot, EquipKind>>;
  handTool: HandTool;
  dayTime: number;
  props: PropSave[];
  campfires: (PlacementSave & { fuel: number })[];
  workbench: (PlacementSave & { level: number }) | null;
  /** 场上所有木箱(落点与箱内格子) */
  crates: (PlacementSave & { slots: InventorySlot[] })[];
  drops: { kind: ResourceKind; count: number; x: number; z: number; source: DropSource }[];
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
