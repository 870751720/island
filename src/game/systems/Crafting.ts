import type { InventorySlot, ResourceKind, Inventory } from './Inventory';
import { EQUIPMENT, isEquipKind, type EquipKind, type EquipSlot } from './Equipment';

/** 可拥有的工具 */
export type ToolId = 'axe' | 'pickaxe' | 'hoe' | 'fishingrod' | 'bow' | 'sword';

/** 二级工具配方 id(refined- 前缀区分基础工具) */
export type RefinedToolId = `refined-${ToolId}`;

/** 三级铁制工具配方 id */
export type IronToolId = `iron-${ToolId}`;

/** 工具等级:0 未拥有、1 基础、2 二级(二级工作台升级)、3 三级(三级工作台铁制) */
export type Tools = Record<ToolId, number>;

/** 配方 id:工具与其同名,材料类与装备类为产物入口 */
export type CraftId =
  | ToolId
  | RefinedToolId
  | IronToolId
  | 'rope'
  | 'arrow'
  | 'crate'
  | 'fenceWood'
  | 'fenceStone'
  | 'fenceGate'
  | 'bed'
  | 'bed2'
  | 'bed3'
  | 'baitBarrel'
  | 'smelter'
  | 'torch'
  | EquipKind;

export type Recipe = {
  id: CraftId;
  name: string;
  cost: Partial<Record<ResourceKind, number>>;
  /** 制作站点:hand 为手搓卡片,workbench 为只能在靠近工作台时制作 */
  station: 'hand' | 'workbench';
  /** 工具类:制作完成即永久拥有(不进背包、不可丢弃) */
  tool?: ToolId;
  /** 工具类产物的等级(基础工具缺省 1,二级工具为 2,三级铁制工具为 3) */
  tier?: 2 | 3;
  /** 材料类:产物进背包,可反复制作 */
  output?: ResourceKind;
  /** 单次制作的产物个数(默认 1,如 1 根树枝削 10 只箭) */
  outputCount?: number;
  /** 需要的工作台等级(缺省 1 级即可,二级工具需 2 级) */
  minBenchLevel?: number;
  /** 仅允许从背包制作页发起,不在场景中弹出快捷制作卡片 */
  hidePrompt?: boolean;
  /** 手搓卡片弹出优先级:数字越小越先弹;同一时刻只显示优先级最高的一张(station 为 hand 的配方必填,见 RECIPES 定义后的校验) */
  promptPriority?: number;
};

/** 各工具按等级的名称(工具 tab 与制作面板展示用) */
const TOOL_NAMES: Record<ToolId, [string, string, string]> = {
  axe: ['木斧', '石斧', '铁斧'],
  pickaxe: ['木镐', '石镐', '铁镐'],
  hoe: ['木锄', '石锄', '铁锄'],
  fishingrod: ['树枝鱼竿', '木鱼竿', '铁鱼竿'],
  bow: ['树枝弓', '木弓', '铁弓'],
  sword: ['木剑', '石剑', '铁剑'],
};

export function toolName(tool: ToolId, tier: number): string {
  return TOOL_NAMES[tool][Math.min(tier, 3) - 1] ?? TOOL_NAMES[tool][0];
}

/** 全部工具(工具 tab 展示顺序) */
export const TOOL_IDS: ToolId[] = ['axe', 'pickaxe', 'hoe', 'fishingrod', 'bow', 'sword'];

/** 配方图标对应的道具(工具类即工具本身,材料/装备类为产物) */
export function recipeIconKind(recipe: Recipe): ResourceKind {
  return recipe.tool ?? recipe.output!;
}

/** 配方图标的级别角标(二级工具为 2,其余无) */
export function recipeIconLevel(recipe: Recipe): number | undefined {
  return recipe.tier;
}

export const RECIPES: Recipe[] = [
  {
    id: 'axe',
    name: '木斧',
    cost: { branch: 1, stone: 1 },
    station: 'hand',
    promptPriority: 1,
    tool: 'axe',
  },
  {
    id: 'pickaxe',
    name: '木镐',
    cost: { branch: 1, stone: 1 },
    station: 'hand',
    promptPriority: 2,
    tool: 'pickaxe',
  },
  {
    id: 'torch',
    name: '火把',
    cost: { branch: 1, flint: 1 },
    station: 'hand',
    output: 'torch',
    promptPriority: 4,
    hidePrompt: true,
  },
  {
    id: 'rope',
    name: '绳线',
    cost: { fiber: 3 },
    station: 'workbench',
    output: 'rope',
  },
  {
    id: 'fishingrod',
    name: '树枝鱼竿',
    cost: { branch: 1, rope: 1 },
    station: 'workbench',
    tool: 'fishingrod',
  },
  {
    id: 'bow',
    name: '树枝弓',
    cost: { branch: 1, rope: 1 },
    station: 'workbench',
    tool: 'bow',
  },
  {
    id: 'hoe',
    name: '木锄',
    cost: { branch: 1, stone: 2 },
    station: 'workbench',
    tool: 'hoe',
    hidePrompt: true,
  },
  {
    id: 'sword',
    name: '木剑',
    cost: { wood: 2 },
    station: 'workbench',
    tool: 'sword',
  },
  {
    id: 'refined-axe',
    name: '石斧',
    cost: { wood: 3, stone: 2 },
    station: 'workbench',
    tool: 'axe',
    tier: 2,
    minBenchLevel: 2,
  },
  {
    id: 'refined-pickaxe',
    name: '石镐',
    cost: { wood: 2, stone: 3 },
    station: 'workbench',
    tool: 'pickaxe',
    tier: 2,
    minBenchLevel: 2,
  },
  {
    id: 'refined-sword',
    name: '石剑',
    cost: { stone: 5 },
    station: 'workbench',
    tool: 'sword',
    tier: 2,
    minBenchLevel: 2,
  },
  {
    id: 'refined-fishingrod',
    name: '木鱼竿',
    cost: { wood: 3, rope: 2 },
    station: 'workbench',
    tool: 'fishingrod',
    tier: 2,
    minBenchLevel: 2,
  },
  {
    id: 'refined-bow',
    name: '木弓',
    cost: { wood: 1, rope: 5 },
    station: 'workbench',
    tool: 'bow',
    tier: 2,
    minBenchLevel: 2,
  },
  {
    id: 'refined-hoe',
    name: '石锄',
    cost: { wood: 2, stone: 1 },
    station: 'workbench',
    tool: 'hoe',
    tier: 2,
    minBenchLevel: 2,
  },
  {
    id: 'iron-sword',
    name: '铁剑',
    cost: { wood: 3, ironIngot: 2 },
    station: 'workbench',
    tool: 'sword',
    tier: 3,
    minBenchLevel: 3,
  },
  {
    id: 'iron-pickaxe',
    name: '铁镐',
    cost: { wood: 2, ironIngot: 3 },
    station: 'workbench',
    tool: 'pickaxe',
    tier: 3,
    minBenchLevel: 3,
  },
  {
    id: 'iron-axe',
    name: '铁斧',
    cost: { wood: 3, ironIngot: 2 },
    station: 'workbench',
    tool: 'axe',
    tier: 3,
    minBenchLevel: 3,
  },
  {
    id: 'iron-fishingrod',
    name: '铁鱼竿',
    cost: { ironIngot: 1, rope: 5 },
    station: 'workbench',
    tool: 'fishingrod',
    tier: 3,
    minBenchLevel: 3,
  },
  {
    id: 'iron-bow',
    name: '铁弓',
    cost: { ironIngot: 3, rope: 5 },
    station: 'workbench',
    tool: 'bow',
    tier: 3,
    minBenchLevel: 3,
  },
  {
    id: 'iron-hoe',
    name: '铁锄',
    cost: { wood: 2, ironIngot: 1 },
    station: 'workbench',
    tool: 'hoe',
    tier: 3,
    minBenchLevel: 3,
  },
  {
    id: 'arrow',
    name: '箭 ×5',
    cost: { wood: 1 },
    station: 'workbench',
    output: 'arrow',
    outputCount: 5,
  },
  {
    id: 'crate',
    name: '木箱',
    cost: { wood: 3 },
    station: 'workbench',
    output: 'crate',
  },
  {
    id: 'fenceWood',
    name: '木围栏 ×2',
    cost: { wood: 1 },
    station: 'workbench',
    output: 'fenceWood',
    outputCount: 2,
    minBenchLevel: 2,
  },
  {
    id: 'fenceStone',
    name: '石围栏 ×2',
    cost: { stone: 1 },
    station: 'workbench',
    output: 'fenceStone',
    outputCount: 2,
    minBenchLevel: 2,
  },
  {
    id: 'fenceGate',
    name: '围栏门',
    cost: { wood: 2 },
    station: 'workbench',
    output: 'fenceGate',
    minBenchLevel: 2,
  },
  {
    id: 'bed',
    name: '床',
    cost: { branch: 8, stone: 2, rope: 2 },
    station: 'workbench',
    output: 'bed1',
  },
  {
    id: 'bed2',
    name: '二级床',
    cost: { bed1: 1, fur: 4, wood: 4, stone: 4 },
    station: 'workbench',
    output: 'bed2',
    minBenchLevel: 2,
  },
  {
    id: 'bed3',
    name: '三级床',
    cost: { bed2: 1, fur: 10 },
    station: 'workbench',
    output: 'bed3',
    minBenchLevel: 3,
  },
  {
    id: 'baitBarrel',
    name: '饵料桶',
    cost: { wood: 4, rope: 1 },
    station: 'workbench',
    output: 'baitBarrel',
    minBenchLevel: 2,
  },
  {
    id: 'smelter',
    name: '冶炼炉',
    cost: { stone: 10, flint: 3 },
    station: 'workbench',
    output: 'smelter',
    minBenchLevel: 3,
  },
  {
    id: 'grassShirt',
    name: '草衣',
    cost: { branch: 1, fiber: 1 },
    station: 'hand',
    promptPriority: 6,
    output: 'grassShirt',
  },
  {
    id: 'grassPants',
    name: '草裤',
    cost: { branch: 1, fiber: 1 },
    station: 'hand',
    promptPriority: 7,
    output: 'grassPants',
  },
  {
    id: 'strawHat',
    name: '草帽',
    cost: { fiber: 2 },
    station: 'hand',
    promptPriority: 8,
    output: 'strawHat',
  },
  {
    id: 'strawBackpack',
    name: '草包',
    cost: { fiber: 4 },
    station: 'workbench',
    output: 'strawBackpack',
  },
  {
    id: 'furShirt',
    name: '皮衣',
    cost: { fur: 2, rope: 3 },
    station: 'workbench',
    output: 'furShirt',
  },
  {
    id: 'furPants',
    name: '皮裤',
    cost: { fur: 2, rope: 2 },
    station: 'workbench',
    output: 'furPants',
  },
  {
    id: 'furHat',
    name: '皮帽',
    cost: { fur: 1, rope: 1 },
    station: 'workbench',
    output: 'furHat',
  },
  {
    id: 'furBackpack',
    name: '皮包',
    cost: { fur: 4, rope: 4 },
    station: 'workbench',
    output: 'furBackpack',
  },
];

for (const r of RECIPES) {
  if (r.station === 'hand' && r.promptPriority === undefined) {
    throw new Error(`手搓配方 ${r.id} 缺少 promptPriority`);
  }
}

/** 全局唯一工作台的配方:2 石头 + 1 树枝(branch) */
export const WORKBENCH_COST: Partial<Record<ResourceKind, number>> = { stone: 2, branch: 1 };

/** 工作台卡片在手搓卡片中的弹出优先级(数值含义同 Recipe.promptPriority) */
export const WORKBENCH_PROMPT_PRIORITY = 4;

/** 工作台升到对应等级(键为目标等级)消耗的材料;三级起需要猎熊掉落的冒险家的经验书 */
export const WORKBENCH_UPGRADE_COST: Record<number, Partial<Record<ResourceKind, number>>> = {
  2: { fur: 4 },
  3: { adventureBook: 1, stone: 20, branch: 20, rope: 5 },
  4: { fur: 4 },
};

/** 把工作台从 level 升到下一级的材料表(满级为空表) */
export function workbenchUpgradeCost(level: number): Partial<Record<ResourceKind, number>> {
  return WORKBENCH_UPGRADE_COST[level + 1] ?? {};
}

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
  // 工具类:已拥有该等级(或更高)则不可再制作
  if (recipe.tool)
    return tools[recipe.tool] >= (recipe.tier ?? 1) || !hasCost(recipe.cost, counts) ? 0 : 1;
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
  if (
    recipe.tool
      ? tools[recipe.tool] >= (recipe.tier ?? 1)
      : !canCraft(recipe, inventory)
  )
    return false;
  for (const [kind, n] of Object.entries(recipe.cost)) {
    inventory.remove(kind as ResourceKind, n ?? 0);
  }
  if (recipe.tool) {
    // 工具制作完成即永久拥有(二级工具直接替换基础工具),不进背包
    tools[recipe.tool] = recipe.tier ?? 1;
    return true;
  }
  return give(recipe.output!, recipe.outputCount ?? 1) > 0;
}
