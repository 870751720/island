import type { ResourceKind, Inventory } from './Inventory';

/** 可拥有的工具 */
export type ToolId = 'axe' | 'pickaxe' | 'fishingrod';

export type Tools = Record<ToolId, boolean>;

/** 配方 id:工具与其同名,材料类为产物入口 */
export type CraftId = ToolId | 'rope';

export type Recipe = {
  id: CraftId;
  name: string;
  icon: string;
  cost: Partial<Record<ResourceKind, number>>;
  /** 制作站点:hand 为手搓卡片,workbench 为只能在靠近工作台时制作 */
  station: 'hand' | 'workbench';
  /** 工具类:制作后永久拥有 */
  tool?: ToolId;
  /** 材料类:产物进背包,可反复制作 */
  output?: ResourceKind;
};

export const RECIPES: Recipe[] = [
  {
    id: 'axe',
    name: '斧子',
    icon: '🪓',
    cost: { wood: 2, gravel: 2 },
    station: 'hand',
    tool: 'axe',
  },
  {
    id: 'pickaxe',
    name: '镐子',
    icon: '⛏️',
    cost: { wood: 2, gravel: 3 },
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
];

/** 全局唯一工作台的配方:2 石头 + 1 树枝 */
export const WORKBENCH_COST: Partial<Record<ResourceKind, number>> = { stone: 2, wood: 1 };

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

export function craft(recipe: Recipe, inventory: Inventory, tools: Tools): boolean {
  if (recipe.tool ? tools[recipe.tool] : !canCraft(recipe, inventory)) return false;
  for (const [kind, n] of Object.entries(recipe.cost)) {
    inventory.remove(kind as ResourceKind, n ?? 0);
  }
  if (recipe.tool) {
    tools[recipe.tool] = true;
  } else {
    return inventory.add(recipe.output!, 1) > 0;
  }
  return true;
}
