import type { InventorySlot, ResourceKind } from '@/game/systems/Inventory';

/** 只读背包快照中的指定道具总数。 */
export function itemCount(slots: readonly InventorySlot[], kind: ResourceKind): number {
  return slots.reduce(
    (total, slot) => total + (slot?.kind === kind ? slot.count : 0),
    0
  );
}
