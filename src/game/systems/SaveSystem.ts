import type { InventorySlot, ResourceKind } from './Inventory';
import type { PropKind } from '../world/Props';
import type { HandTool } from '../entities/Player';

const SAVE_KEY = 'island.save.v1';
const SAVE_VERSION = 1;

/** 资源点可恢复状态(与 Props.list 顺序一一对应,布局由种子保证一致) */
export type PropSave = {
  kind: PropKind;
  ready: boolean;
  regrowLeft: number;
  stage?: 'full' | 'stump';
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
  handTool: HandTool;
  dayTime: number;
  props: PropSave[];
  campfires: (PlacementSave & { fuel: number })[];
  workbench: PlacementSave | null;
  drops: { kind: ResourceKind; count: number; x: number; z: number }[];
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
