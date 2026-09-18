import { FOODS } from '@/game/systems/Food';
import { EQUIPMENT, isEquipKind } from '@/game/systems/Equipment';
import { ITEMS, itemCategory, itemSortIndex, ITEM_CATEGORIES, type ItemCategory } from '@/game/systems/Items';
import { TOOL_IDS, toolName } from '@/game/systems/Crafting';
import type { ResourceKind } from '@/game/systems/Inventory';

/** 详情页的属性行:标签 + 展示值 */
export type ItemWikiStat = { label: string; value: string };

export type ItemWikiEntry = {
  kind: ResourceKind;
  category: ItemCategory;
  stats: readonly ItemWikiStat[];
};

const FOOD_BY_KIND = new Map(FOODS.map((food) => [food.kind, food] as const));

/** 工具的等级名(剪刀无等级,去重后只留一个) */
const TOOL_TIER_NAMES = new Map<ResourceKind, readonly string[]>(
  TOOL_IDS.map((id) => {
    const tiers = [toolName(id, 1), toolName(id, 2), toolName(id, 3)];
    return [id as ResourceKind, [...new Set(tiers)]] as const;
  })
);

/** 汇总单件物品的玩法属性:进食回复、燃烧时长、工具等级、装备加成 */
function buildStats(kind: ResourceKind): ItemWikiStat[] {
  const stats: ItemWikiStat[] = [];
  const def = ITEMS[kind];
  if (def.burnTime) stats.push({ label: '可燃', value: `投入火堆 +${def.burnTime} 秒` });
  const food = FOOD_BY_KIND.get(kind);
  if (food) {
    if (food.hunger > 0) stats.push({ label: '饱食', value: `+${food.hunger}` });
    if (food.thirst > 0) stats.push({ label: '水分', value: `+${food.thirst}` });
    if (food.health > 0) stats.push({ label: '生命', value: `+${food.health}` });
  }
  const tiers = TOOL_TIER_NAMES.get(kind);
  if (tiers) stats.push({ label: '等级', value: tiers.join(' → ') });
  if (isEquipKind(kind)) {
    const equip = EQUIPMENT[kind];
    if (equip.capacity) stats.push({ label: '背包', value: `${equip.capacity} 格` });
    if (equip.defense) stats.push({ label: '防御', value: `+${equip.defense}` });
    if (equip.reduce) stats.push({ label: '减伤', value: `${Math.round(equip.reduce * 100)}%` });
    if (equip.thirstMod) stats.push({ label: '口渴速度', value: `−${Math.round((1 - equip.thirstMod) * 100)}%` });
  }
  return stats;
}

function toEntry(kind: ResourceKind): ItemWikiEntry {
  return { kind, category: itemCategory(kind), stats: buildStats(kind) };
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
