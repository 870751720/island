import { rememberRecipes } from '../meta/RecipeDiscoveries';
import type { HudSnapshot } from '../GameContracts';
import type { PlayerSession } from '../mp/PlayerSession';
import type { PickupPresentation } from '../presentation/PickupPresentation';
import type { InventorySlot, ResourceKind } from '../systems/Inventory';
import { SLOT_ORDER } from '../systems/Equipment';

const countSlots = (slots: readonly InventorySlot[]): Map<ResourceKind, number> => {
  const counts = new Map<ResourceKind, number>();
  for (const slot of slots) if (slot) counts.set(slot.kind, (counts.get(slot.kind) ?? 0) + slot.count);
  return counts;
};

/** Applies host HUD snapshots to guest-owned state and replays local-only feedback. */
export class GuestHudSynchronizer {
  private confirmedAmmo: { arrow: number; bait: number } | null = null;

  constructor(
    private readonly local: PlayerSession,
    private readonly pickup: PickupPresentation,
    private readonly syncToolTiers: () => void,
    private readonly pushHud: (snapshot: HudSnapshot) => void,
    private readonly localOverlay: () => Pick<HudSnapshot, 'autoEquipProgress' | 'notice'>
  ) {}

  apply(snapshot: HudSnapshot): void {
    for (const kind of snapshot.discoveredRecipes) this.local.discoverRecipe(kind);
    rememberRecipes(snapshot.discoveredRecipes);
    if (snapshot.research.serial >= this.local.research.serial) {
      const remaining = snapshot.research.serial === this.local.research.serial
        ? Math.min(this.local.research.remaining, snapshot.research.remaining) : snapshot.research.remaining;
      this.local.research = { ...snapshot.research, remaining, ingredients: [...snapshot.research.ingredients] };
    }
    const before = countSlots(this.local.inventory.snapshot());
    this.local.inventory.load(snapshot.slots, snapshot.capacity);
    for (const [kind, count] of countSlots(snapshot.slots)) {
      const gained = count - (before.get(kind) ?? 0);
      if (gained > 0) this.pickup.emit(kind, gained);
    }
    Object.assign(this.local.tools, snapshot.toolTiers);
    for (const kind of ['arrow', 'bait'] as const) {
      // 本地射箭/挂饵可能已预扣；旧快照回填不能当成新获得物品。
      const gained = this.confirmedAmmo ? snapshot[kind] - this.confirmedAmmo[kind] : 0;
      this.local.ammo[kind] = snapshot[kind];
      if (gained > 0) this.pickup.emit(kind, gained);
    }
    this.confirmedAmmo = { arrow: snapshot.arrow, bait: snapshot.bait };
    this.local.craftedIds.clear();
    for (const id of snapshot.craftedIds) this.local.craftedIds.add(id);
    this.syncToolTiers();
    if (SLOT_ORDER.some((slot) => this.local.equipment.getEquipped(slot) !== snapshot.equipped[slot])) {
      this.local.equipment.restore(snapshot.equipped, this.local.inventory);
    }
    this.pushHud({ ...snapshot, ...this.localOverlay() });
  }

}
