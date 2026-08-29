import { ITEMS } from '@/game/systems/Items';
import type { ResourceKind } from '@/game/systems/Inventory';

/** 配方材料文案:统一用道具正式名称(如「2树枝 3绳线」),避免内部 id 泄漏到玩家视角 */
export function costLabel(cost: Record<string, number | undefined>, sep = ' '): string {
  return Object.entries(cost)
    .filter(([, n]) => !!n)
    .map(([k, n]) => `${n}${ITEMS[k as ResourceKind].name}`)
    .join(sep);
}
