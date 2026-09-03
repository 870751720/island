import type { InventorySlot, ResourceKind, Inventory } from './Inventory';
import { EQUIPMENT, isEquipKind, type EquipKind, type EquipSlot } from './Equipment';

/** 可拥有的工具 */
export type ToolId = 'axe' | 'pickaxe' | 'hoe' | 'fishingrod' | 'bow';

/** 精致工具配方 id(refined- 前缀区分基础工具) */
export type RefinedToolId = `refined-${ToolId}`;

/** 工具等级:0 未拥有、1 基础、2 精致(二级工作台升级) */
export type Tools = Record<ToolId, number>;

/** 配方 id:工具与其同名,材料类与装备类为产物入口 */
export type CraftId =
  | ToolId
  | RefinedToolId
  | 'rope'
  | 'arrow'
  | 'crate'
  | 'fenceWood'
  | 'fenceStone'
  | 'fenceGate'
  | 'bed'
  | 'bed2'
  | 'baitCrab'
  | 'baitBird'
  | 'baitGame'
  | EquipKind;

export type Recipe = {
  id: CraftId;
  name: string;
  icon: string;
  cost: Partial<Record<ResourceKind, number>>;
  /** 制作站点:hand 为手搓卡片,workbench 为只能在靠近工作台时制作 */
  station: 'hand' | 'workbench';
  /** 工具类:制作完成即永久拥有(不进背包、不可丢弃) */
  tool?: ToolId;
  /** 工具类产物的等级(基础工具缺省 1,精致工具为 2) */
  tier?: 2;
  /** 材料类:产物进背包,可反复制作 */
  output?: ResourceKind;
  /** 单次制作的产物个数(默认 1,如 1 根树枝削 10 只箭) */
  outputCount?: number;
  /** 需要的工作台等级(缺省 1 级即可,精致工具需 2 级) */
  minBenchLevel?: number;
  /** 鱼饵类手搓配方:只在手持鱼竿且背包没有鱼饵时弹出制作卡片 */
  baitPrompt?: boolean;
  /** 仅允许从背包制作页发起,不在场景中弹出快捷制作卡片 */
  hidePrompt?: boolean;
  /** 手搓卡片弹出优先级:数字越小越先弹;同一时刻只显示优先级最高的一张(station 为 hand 的配方必填,见 RECIPES 定义后的校验) */
  promptPriority?: number;
};

/** 各工具按等级的名称(工具 tab 与制作面板展示用) */
const TOOL_NAMES: Record<ToolId, [string, string]> = {
  axe: ['石斧', '精致石斧'],
  pickaxe: ['石镐', '精致石镐'],
  hoe: ['石锄', '精致石锄'],
  fishingrod: ['树枝鱼竿', '精致鱼竿'],
  bow: ['粗制弓', '精致弓'],
};

export function toolName(tool: ToolId, tier: number): string {
  return TOOL_NAMES[tool][Math.min(tier, 2) - 1] ?? TOOL_NAMES[tool][0];
}

/** 全部工具(工具 tab 展示顺序) */
export const TOOL_IDS: ToolId[] = ['axe', 'pickaxe', 'hoe', 'fishingrod', 'bow'];

export const RECIPES: Recipe[] = [
  {
    id: 'axe',
    name: '石斧',
    icon: '🪓',
    cost: { wood: 1, stone: 1 },
    station: 'hand',
    promptPriority: 1,
    tool: 'axe',
  },
  {
    id: 'pickaxe',
    name: '石镐',
    icon: '⛏️',
    cost: { wood: 1, stone: 1 },
    station: 'hand',
    promptPriority: 2,
    tool: 'pickaxe',
  },
  {
    id: 'hoe',
    name: '石锄',
    icon: '⚒️',
    cost: { wood: 1, stone: 1 },
    station: 'hand',
    promptPriority: 3,
    tool: 'hoe',
    hidePrompt: true,
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
    name: '树枝鱼竿',
    icon: '🎣',
    cost: { wood: 1, rope: 1 },
    station: 'workbench',
    tool: 'fishingrod',
  },
  {
    id: 'bow',
    name: '粗制弓',
    icon: '🏹',
    cost: { wood: 1, rope: 1 },
    station: 'workbench',
    tool: 'bow',
  },
  {
    id: 'refined-axe',
    name: '精致石斧',
    icon: '🪓',
    cost: { wood: 2, stone: 2 },
    station: 'workbench',
    tool: 'axe',
    tier: 2,
    minBenchLevel: 2,
  },
  {
    id: 'refined-pickaxe',
    name: '精致石镐',
    icon: '⛏️',
    cost: { wood: 2, stone: 2 },
    station: 'workbench',
    tool: 'pickaxe',
    tier: 2,
    minBenchLevel: 2,
  },
  {
    id: 'refined-hoe',
    name: '精致石锄',
    icon: '⚒️',
    cost: { wood: 2, stone: 2 },
    station: 'workbench',
    tool: 'hoe',
    tier: 2,
    minBenchLevel: 2,
  },
  {
    id: 'refined-fishingrod',
    name: '精致鱼竿',
    icon: '🎣',
    cost: { wood: 2, rope: 2 },
    station: 'workbench',
    tool: 'fishingrod',
    tier: 2,
    minBenchLevel: 2,
  },
  {
    id: 'refined-bow',
    name: '精致弓',
    icon: '🏹',
    cost: { wood: 2, rope: 2 },
    station: 'workbench',
    tool: 'bow',
    tier: 2,
    minBenchLevel: 2,
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
    id: 'fenceWood',
    name: '木围栏 ×2',
    icon: '🚧',
    cost: { wood: 1 },
    station: 'workbench',
    output: 'fenceWood',
    outputCount: 2,
    minBenchLevel: 2,
  },
  {
    id: 'fenceStone',
    name: '石围栏 ×2',
    icon: '🧱',
    cost: { stone: 1 },
    station: 'workbench',
    output: 'fenceStone',
    outputCount: 2,
    minBenchLevel: 2,
  },
  {
    id: 'fenceGate',
    name: '围栏门',
    icon: '🚪',
    cost: { wood: 2 },
    station: 'workbench',
    output: 'fenceGate',
    minBenchLevel: 2,
  },
  {
    id: 'bed',
    name: '床',
    icon: '🛏️',
    cost: { wood: 8, stone: 2, rope: 2 },
    station: 'workbench',
    output: 'bed1',
  },
  {
    id: 'bed2',
    name: '二级床',
    icon: '🛏️',
    cost: { bed1: 1, stone: 10 },
    station: 'workbench',
    output: 'bed2',
  },
  {
    id: 'baitCrab',
    name: '鱼饵 ×2',
    icon: '🪱',
    cost: { crabMeat: 1 },
    station: 'hand',
    promptPriority: 9,
    output: 'bait',
    outputCount: 2,
    baitPrompt: true,
  },
  {
    id: 'baitBird',
    name: '鱼饵 ×3',
    icon: '🪱',
    cost: { birdMeat: 1 },
    station: 'hand',
    promptPriority: 10,
    output: 'bait',
    outputCount: 3,
    baitPrompt: true,
  },
  {
    id: 'baitGame',
    name: '鱼饵 ×10',
    icon: '🪱',
    cost: { gameMeat: 1 },
    station: 'hand',
    promptPriority: 11,
    output: 'bait',
    outputCount: 10,
    baitPrompt: true,
  },
  {
    id: 'grassShirt',
    name: '草衣',
    icon: '🍃',
    cost: { wood: 1, fiber: 1 },
    station: 'hand',
    promptPriority: 6,
    output: 'grassShirt',
  },
  {
    id: 'grassPants',
    name: '草裤',
    icon: '🍂',
    cost: { wood: 1, fiber: 1 },
    station: 'hand',
    promptPriority: 7,
    output: 'grassPants',
  },
  {
    id: 'strawHat',
    name: '草帽',
    icon: '👒',
    cost: { fiber: 2 },
    station: 'hand',
    promptPriority: 8,
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

for (const r of RECIPES) {
  if (r.station === 'hand' && r.promptPriority === undefined) {
    throw new Error(`手搓配方 ${r.id} 缺少 promptPriority`);
  }
}

/** 全局唯一工作台的配方:2 石头 + 1 树枝 */
export const WORKBENCH_COST: Partial<Record<ResourceKind, number>> = { stone: 2, wood: 1 };

/** 工作台卡片在手搓卡片中的弹出优先级(数值含义同 Recipe.promptPriority) */
export const WORKBENCH_PROMPT_PRIORITY = 4;

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
    // 工具制作完成即永久拥有(精致工具直接替换基础工具),不进背包
    tools[recipe.tool] = recipe.tier ?? 1;
    return true;
  }
  return give(recipe.output!, recipe.outputCount ?? 1) > 0;
}
