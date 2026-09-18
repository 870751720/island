import type { ResourceKind } from '@/game/systems/Inventory';
import { FOODS } from '@/game/systems/Food';

/** 背包与手持面板共享权威 HUD 的设施清单，包括联机客人。 */
export function isBackpackItemUsable(kind: ResourceKind, placeables: readonly { kind: ResourceKind }[]): boolean {
  return FOODS.some((food) => food.kind === kind) || kind === 'bottle' || kind === 'letter' ||
    placeables.some((entry) => entry.kind === kind);
}
