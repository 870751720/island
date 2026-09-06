import { ITEMS } from '@/game/systems/Items';
import type { ResourceKind } from '@/game/systems/Inventory';
import { toolName, toolUpgradeFrom, type Recipe } from '@/game/systems/Crafting';

/** 配方材料文案:统一用道具正式名称(如「2树枝 3绳线」),避免内部 id 泄漏到玩家视角 */
export function costLabel(cost: Record<string, number | undefined>, sep = ' '): string {
  return Object.entries(cost)
    .filter(([, n]) => !!n)
    .map(([k, n]) => `${n}${ITEMS[k as ResourceKind].name}`)
    .join(sep);
}

/** 配方完整材料文案:二/三级工具在普通材料前追加低一级同种工具(拥有即视为材料) */
export function recipeCostLabel(recipe: Recipe, sep = ' '): string {
  const from = toolUpgradeFrom(recipe);
  return [from ? `1${toolName(from.tool, from.tier)}` : '', costLabel(recipe.cost, sep)]
    .filter(Boolean)
    .join(sep);
}
