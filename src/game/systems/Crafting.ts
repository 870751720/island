import type { InventorySlot, ResourceKind, Inventory } from './Inventory';
import { EQUIPMENT, isEquipKind, type EquipKind, type EquipSlot } from './Equipment';

/** 可拥有的工具 */
export type ToolId = 'axe' | 'pickaxe' | 'fishingrod' | 'bow';

export type Tools = Record<ToolId, boolean>;

/** 配方 id:工具与其同名,材料类与装备类为产物入口 */
export type CraftId = ToolId | 'rope' | 'arrow' | 'crate' | EquipKind;

export type Recipe = {
  id: CraftId;
  name: string;
  icon: string;
  cost: Partial<Record<ResourceKind, number>>;
  /** 制作站点:hand 为手搓卡片,workbench 为只能在靠近工作台时制作 */
  station: 'hand' | 'workbench';
  /** 工具类:制作完成即永久拥有(不进背包、不可丢弃) */
  tool?: ToolId;
  /** 材料类:产物进背包,可反复制作 */
  output?: ResourceKind;
  /** 单次制作的产物个数(默认 1,如 1 根树枝削 10 只箭) */
  outputCount?: number;
};

/** 全部工具(工具 tab 展示顺序) */
export const TOOL_IDS: ToolId[] = ['axe', 'pickaxe', 'fishingrod', 'bow'];

export const RECIPES: Recipe[] = [
  {
    id: 'axe',
    name: '斧子',
    icon: '🪓',
    cost: { wood: 2, stone: 2 },
    station: 'hand',
    tool: 'axe',
  },
  {
    id: 'pickaxe',
    name: '镐子',
    icon: '⛏️',
    cost: { wood: 2, stone: 3 },
    station: 'hand',
    tool: 'pickaxe',
  },
  {
    id: 'rope',
    name: '绳线',
    icon: '🧵',
    cost: { fiber: 3 },
    station: 'workbench',
    output: 'rope',
  },
  {
    id: 'fishingrod',
    name: '鱼竿',
    icon: '🎣',
    cost: { wood: 1, rope: 2 },
    station: 'workbench',
    tool: 'fishingrod',
  },
  {
    id: 'bow',
    name: '弓',
    icon: '🏹',
    cost: { wood: 1, rope: 2 },
    station: 'workbench',
    tool: 'bow',
  },
  {
    id: 'arrow',
    name: '箭 ×10',
    icon: '🏹',
    cost: { wood: 1 },
    station: 'workbench',
    output: 'arrow',
    outputCount: 10,
  },
  {
    id: 'crate',
    name: '木箱',
    icon: '📦',
    cost: { wood: 4 },
    station: 'workbench',
    output: 'crate',
  },
  {
    id: 'grassShirt',
    name: '草衣',
    icon: '🍃',
    cost: { wood: 1, fiber: 1 },
    station: 'hand',
    output: 'grassShirt',
  },
  {
    id: 'grassPants',
    name: '草裤',
    icon: '🍂',
    cost: { wood: 1, fiber: 1 },
    station: 'hand',
    output: 'grassPants',
  },
  {
    id: 'strawHat',
    name: '草帽',
    icon: '👒',
    cost: { fiber: 2 },
    station: 'hand',
    output: 'strawHat',
  },
  {
    id: 'strawBackpack',
    name: '草包',
    icon: '🎒',
    cost: { fiber: 4 },
    station: 'workbench',
    output: 'strawBackpack',
  },
  {
    id: 'furShirt',
    name: '皮衣',
    icon: '👕',
    cost: { fur: 2, rope: 3 },
    station: 'workbench',
    output: 'furShirt',
  },
  {
    id: 'furPants',
    name: '皮裤',
    icon: '👖',
    cost: { fur: 2, rope: 2 },
    station: 'workbench',
    output: 'furPants',
  },
  {
    id: 'furHat',
    name: '皮帽',
    icon: '🎩',
    cost: { fur: 1, rope: 1 },
    station: 'workbench',
    output: 'furHat',
  },
  {
    id: 'furBackpack',
    name: '皮包',
    icon: '🧺',
    cost: { fur: 4, rope: 4 },
    station: 'workbench',
    output: 'furBackpack',
  },
];

/** 全局唯一工作台的配方:2 石头 + 1 树枝 */
export const WORKBENCH_COST: Partial<Record<ResourceKind, number>> = { stone: 2, wood: 1 };

/** 工作台每升一级消耗的石头数 */
export const WORKBENCH_UPGRADE_STONES = 10;

/** 按资源数量表判断材料是否足够(背包与 HUD 快照均可传入) */
export function hasCost(cost: Recipe['cost'], counts: Partial<Record<ResourceKind, number>>): boolean {
  return Object.entries(cost).every(
    ([kind, n]) => (counts[kind as ResourceKind] ?? 0) >= (n ?? 0)
  );
}

export function canCraft(recipe: Recipe, inventory: Inventory): boolean {
  return hasCost(
    recipe.cost,
    Object.fromEntries(
      (Object.keys(recipe.cost) as ResourceKind[]).map((kind) => [
        kind,
        inventory.count(kind),
      ])
    )
  );
}

/** 按材料数量表当前最多可制作的个数(工具类为 0 或 1) */
export function maxCraftCount(
  recipe: Recipe,
  counts: Partial<Record<ResourceKind, number>>,
  tools: Tools
): number {
  if (recipe.tool) return tools[recipe.tool] || !hasCost(recipe.cost, counts) ? 0 : 1;
  return Object.entries(recipe.cost).reduce(
    (max, [kind, n]) =>
      Math.min(max, Math.floor((counts[kind as ResourceKind] ?? 0) / (n ?? 1))),
    99
  );
}

/** 各栏位当前穿戴(HUD 快照,未装备为 null) */
export type EquippedMap = Record<EquipSlot, EquipKind | null>;

/**
 * 配方卡片是否展示:材料足够且工具未拥有;装备类还须比身上穿的与背包里存的同栏位装备都更好
 * (否则做出来也用不上)。slots 为背包格子快照。
 */
export function recipeVisible(
  recipe: Recipe,
  counts: Partial<Record<ResourceKind, number>>,
  tools: Tools,
  equipped: EquippedMap,
  slots: (InventorySlot | null)[] = []
): boolean {
  if (recipe.output && isEquipKind(recipe.output)) {
    const def = EQUIPMENT[recipe.output];
    const current = equipped[def.slot];
    if (current && isEquipKind(current) && EQUIPMENT[current].score >= def.score) return false;
    const stored = slots.some(
      (slot) =>
        slot &&
        isEquipKind(slot.kind) &&
        EQUIPMENT[slot.kind].slot === def.slot &&
        EQUIPMENT[slot.kind].score >= def.score
    );
    if (stored) return false;
  }
  return maxCraftCount(recipe, counts, tools) > 0;
}

export function craft(
  recipe: Recipe,
  inventory: Inventory,
  tools: Tools,
  /** 产物入包(背包放不下的部分由该函数负责掉到地上) */
  give: (kind: ResourceKind, count: number) => number = (k, n) => inventory.add(k, n)
): boolean {
  if (recipe.tool ? tools[recipe.tool] : !canCraft(recipe, inventory)) return false;
  for (const [kind, n] of Object.entries(recipe.cost)) {
    inventory.remove(kind as ResourceKind, n ?? 0);
  }
  if (recipe.tool) {
    // 工具制作完成即永久拥有,不进背包
    tools[recipe.tool] = true;
    return true;
  }
  return give(recipe.output!, recipe.outputCount ?? 1) > 0;
}
