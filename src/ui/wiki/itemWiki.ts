import { hiddenRecipe } from '@/game/systems/HiddenRecipes';
import { hasRecipeDiscovery } from '@/game/meta/RecipeDiscoveries';
import { FOODS } from '@/game/systems/Food';
import { CROP_SPECS } from '@/game/entities/Crop';
import { SEED_OF } from '@/game/world/TreeSpecies';
import { EQUIPMENT, isEquipKind } from '@/game/systems/Equipment';
import { ITEMS, itemCategory, itemSortIndex, ITEM_CATEGORIES, type ItemCategory } from '@/game/systems/Items';
import { TOOL_FAMILY_NAMES, TOOL_IDS, toolName } from '@/game/systems/Crafting';
import type { ResourceKind } from '@/game/systems/Inventory';
import { itemSourceGroups, itemSourcesOf, type ItemSource, type SourceGroup } from './itemSources';

/** 详情页的属性行:标签 + 展示值 */
export type ItemWikiStat = { label: string; value: string };

/** 回收方式行:工具 + 动作说明;target 为挖回的其他道具,note 补充时机 */
export type ItemRecycle = { label: string; target?: ResourceKind; note?: string };

/** 铲子可整件挖回道具的设施(与各放置系统的挖掘结算一致),默认整件挖回本道具 */
const DIG_BACK: ItemRecycle = { label: '整件挖回' };
const RECYCLE_BY_KIND: Partial<Record<ResourceKind, ItemRecycle>> = {
  poseidonBlessing: DIG_BACK, beehiveShrine: DIG_BACK, healCrystal: DIG_BACK, rainAltar: DIG_BACK, crocIncense: DIG_BACK, torch: DIG_BACK,
  crate: DIG_BACK, ironCrate: DIG_BACK, fishKeep: DIG_BACK, feedBarrel: DIG_BACK,
  baitBarrel: DIG_BACK, brewBarrel: DIG_BACK, doghouse: DIG_BACK, waterPurifier: DIG_BACK, smelter: DIG_BACK, loom: DIG_BACK, mill: DIG_BACK,
  deadCampfire: { label: '整座挖回' },
  campfire: { label: '整座挖回', target: 'deadCampfire', note: '需燃尽熄灭' },
  cookingStation: DIG_BACK, researchTable: DIG_BACK,
  fenceWood: DIG_BACK, fenceStone: DIG_BACK, fenceGate: DIG_BACK, stoneGate: DIG_BACK, gravelPath: DIG_BACK, plankPath: DIG_BACK,
  bed1: DIG_BACK, bed2: DIG_BACK, bed3: DIG_BACK,
  workbench1: DIG_BACK, workbench2: DIG_BACK, workbench3: DIG_BACK, workbench4: DIG_BACK,
  berryBush: { label: '整棵挖回' }, shrubBush: { label: '整棵挖回' }, grassTuft: { label: '整棵挖回' }, wormNest: { label: '整棵挖回' },
};

export type ItemWikiEntry = {
  kind: ResourceKind;
  category: ItemCategory;
  stats: readonly ItemWikiStat[];
  recycle?: ItemRecycle;
  sourceGroups: readonly SourceGroup[];
  sources: readonly ItemSource[];
};

const FOOD_BY_KIND = new Map(FOODS.map((food) => [food.kind, food] as const));
const PLANTABLE_SEEDS = new Set<ResourceKind>([
  ...Object.values(SEED_OF), ...Object.values(CROP_SPECS).map((crop) => crop.seed),
]);

/** 工具的等级名(去重后逐级列出;只剩一个说明该工具无升级) */
const TOOL_TIER_NAMES = new Map<ResourceKind, readonly string[]>(
  TOOL_IDS.map((id) => {
    const tiers = [toolName(id, 1), toolName(id, 2), toolName(id, 3)];
    return [id as ResourceKind, [...new Set(tiers)]] as const;
  })
);

const TOOL_FAMILY_BY_KIND = new Map<ResourceKind, string>(
  TOOL_IDS.map((id) => [id as ResourceKind, TOOL_FAMILY_NAMES[id]] as const)
);

/** 图鉴展示名:工具条目代表整个等级族,用统一名(如「斧」),其余用道具名 */
export function wikiItemHidden(kind: ResourceKind): boolean { return !!hiddenRecipe(kind) && !hasRecipeDiscovery(kind); }

export function wikiItemName(kind: ResourceKind): string {
  if (wikiItemHidden(kind)) return '待发现';
  return TOOL_FAMILY_BY_KIND.get(kind) ?? ITEMS[kind].name;
}

/** 搜索匹配文本:统一名之外拼上各等级名,搜「铁斧」也能命中「斧」 */
export function wikiItemSearchText(kind: ResourceKind): string {
  const tiers = TOOL_TIER_NAMES.get(kind);
  return tiers ? [wikiItemName(kind), ...tiers].join('') : wikiItemName(kind);
}

/** 汇总单件物品的玩法属性:进食回复、燃烧时长、工具等级、装备加成 */
function buildStats(kind: ResourceKind): ItemWikiStat[] {
  const stats: ItemWikiStat[] = [];
  const def = ITEMS[kind];
  if (itemCategory(kind) === '设施') stats.push({ label: '安放', value: '背包使用或手持选择，在有效位置站定放置' });
  if (PLANTABLE_SEEDS.has(kind)) stats.push({ label: '播种', value: '站定连续播下附近有效格，每颗 0.5 秒，无需移动重触发；移动、无空位或种子耗尽时停止' });
  if (def.burnTime) stats.push({ label: '可燃', value: `投入火堆 +${def.burnTime} 秒` });
  const food = FOOD_BY_KIND.get(kind);
  if (food) {
    if (food.hunger > 0) stats.push({ label: '饱食', value: `+${food.hunger}` });
    if (food.thirst !== 0) stats.push({ label: '水分', value: `${food.thirst > 0 ? '+' : ''}${food.thirst}` });
    if (food.health > 0) stats.push({ label: '生命', value: `+${food.health}` });
    if (hiddenRecipe(kind)) stats.push({ label: '喂食', value: '不可喂动物' });
  }
  const tiers = TOOL_TIER_NAMES.get(kind);
  if (tiers) stats.push({ label: '等级', value: tiers.length > 1 ? tiers.join(' → ') : '无' });
  if (isEquipKind(kind)) {
    const equip = EQUIPMENT[kind];
    if (equip.landSpeedMultiplier) stats.push({ label: '陆地移速', value: `+${(equip.landSpeedMultiplier - 1) * 100}%（乘骑时）` });
    if (equip.capacity) stats.push({ label: '背包', value: `${equip.capacity} 格` });
    if (equip.defense) stats.push({ label: '防御', value: `+${equip.defense}` });
    if (equip.reduce) stats.push({ label: '减伤', value: `${Math.round(equip.reduce * 100)}%` });
    if (equip.thirstMod) stats.push({ label: '口渴速度', value: `−${Math.round((1 - equip.thirstMod) * 100)}%` });
  }
  return stats;
}

function toEntry(kind: ResourceKind): ItemWikiEntry {
  return {
    kind,
    category: itemCategory(kind),
    stats: buildStats(kind),
    recycle: RECYCLE_BY_KIND[kind],
    sourceGroups: itemSourceGroups(kind),
    sources: itemSourcesOf(kind),
  };
}

/** 物品图鉴数据:按分类分组,组内沿用背包整理的登记顺序 */
export const ITEM_WIKI_GROUPS: readonly { category: ItemCategory; entries: readonly ItemWikiEntry[] }[] =
  ITEM_CATEGORIES.map((category) => ({
    category,
    entries: (Object.keys(ITEMS) as ResourceKind[])
      .filter((kind) => itemCategory(kind) === category)
      .sort((a, b) => itemSortIndex(a) - itemSortIndex(b))
      .map(toEntry),
  }));

export const ITEM_WIKI_ENTRIES = new Map(
  ITEM_WIKI_GROUPS.flatMap((group) => group.entries.map((entry) => [entry.kind, entry] as const))
);
