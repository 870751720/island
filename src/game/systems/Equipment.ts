import type { Inventory, ResourceKind } from './Inventory';

/** 装备栏位:衣服/裤子/帽子/背包 */
export type EquipSlot = 'clothing' | 'pants' | 'hat' | 'backpack';

/** 可装备道具的种类 */
export type EquipKind =
  | 'leafShirt'
  | 'fiberShirt'
  | 'leafPants'
  | 'fiberPants'
  | 'strawHat'
  | 'vineHat'
  | 'strawBackpack'
  | 'frameBackpack';

export type EquipmentDef = {
  kind: EquipKind;
  slot: EquipSlot;
  /** 评分:同栏位评分更高才值得换上 */
  score: number;
  /** 衣服/裤子:替换玩家身体/腿部模型颜色 */
  bodyColor?: string;
  /** 背包:装备后背包扩容到的格数 */
  capacity?: number;
};

/** 四类装备各两件的静态定义 */
export const EQUIPMENT: Record<EquipKind, EquipmentDef> = {
  leafShirt: { kind: 'leafShirt', slot: 'clothing', score: 1, bodyColor: '#5a8a3a' },
  fiberShirt: { kind: 'fiberShirt', slot: 'clothing', score: 3, bodyColor: '#c9a15c' },
  leafPants: { kind: 'leafPants', slot: 'pants', score: 1, bodyColor: '#4a7a3a' },
  fiberPants: { kind: 'fiberPants', slot: 'pants', score: 3, bodyColor: '#a8823c' },
  strawHat: { kind: 'strawHat', slot: 'hat', score: 2 },
  vineHat: { kind: 'vineHat', slot: 'hat', score: 4 },
  strawBackpack: { kind: 'strawBackpack', slot: 'backpack', score: 2, capacity: 14 },
  frameBackpack: { kind: 'frameBackpack', slot: 'backpack', score: 4, capacity: 18 },
};

/** 栏位展示顺序与中文名(角色面板用) */
export const SLOT_ORDER: EquipSlot[] = ['clothing', 'pants', 'hat', 'backpack'];
export const SLOT_NAMES: Record<EquipSlot, string> = {
  clothing: '衣服',
  pants: '裤子',
  hat: '帽子',
  backpack: '背包',
};

export function isEquipKind(kind: ResourceKind): kind is EquipKind {
  return kind in EQUIPMENT;
}

/** 已穿戴装备的状态管理:换装/卸下与评分比较 */
export class Equipment {
  private equipped: Partial<Record<EquipSlot, EquipKind>> = {};
  /** 装备变化回调(更新玩家模型与背包容量) */
  onChange: ((slot: EquipSlot, kind: EquipKind | null) => void) | null = null;

  getEquipped(slot: EquipSlot): EquipKind | null {
    return this.equipped[slot] ?? null;
  }

  /** 全部栏位快照(存档与 HUD 用) */
  snapshot(): Record<EquipSlot, EquipKind | null> {
    return {
      clothing: this.getEquipped('clothing'),
      pants: this.getEquipped('pants'),
      hat: this.getEquipped('hat'),
      backpack: this.getEquipped('backpack'),
    };
  }

  /** 从背包装备一件(force=false 时仅当评分高于当前才换),换下的一件放回背包 */
  equip(kind: EquipKind, inventory: Inventory, force = false): boolean {
    const def = EQUIPMENT[kind];
    const current = this.equipped[def.slot];
    if (!force && current && EQUIPMENT[current].score >= def.score) return false;
    if (!inventory.remove(kind, 1)) return false;
    this.equipped[def.slot] = kind;
    if (current) inventory.add(current, 1);
    this.onChange?.(def.slot, kind);
    return true;
  }

  /** 卸下某栏位装备放回背包,背包放不下则失败 */
  unequip(slot: EquipSlot, inventory: Inventory): boolean {
    const kind = this.equipped[slot];
    if (!kind) return false;
    if (inventory.add(kind, 1) < 1) return false;
    delete this.equipped[slot];
    this.onChange?.(slot, null);
    return true;
  }

  /** 从存档恢复各栏位(非法数据忽略),再统一触发回调应用视觉与容量 */
  restore(saved: unknown, inventory: Inventory): void {
    const data = saved as Partial<Record<EquipSlot, unknown>> | null;
    if (!data) return;
    this.equipped = {};
    for (const slot of SLOT_ORDER) {
      const kind = data[slot];
      if (typeof kind === 'string' && isEquipKind(kind as ResourceKind)) {
        this.equipped[slot] = kind as EquipKind;
      }
    }
    const backpack = this.equipped.backpack;
    if (backpack) inventory.setCapacity(EQUIPMENT[backpack].capacity ?? 0);
    for (const slot of SLOT_ORDER) this.onChange?.(slot, this.equipped[slot] ?? null);
  }

  snapshotForSave(): Partial<Record<EquipSlot, EquipKind>> {
    return { ...this.equipped };
  }
}
