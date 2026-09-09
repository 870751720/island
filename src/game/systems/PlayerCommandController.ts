import type { PlayerSession } from '../mp/PlayerSession';
import type { NetGuest } from '../net/NetGuest';
import { RECIPES, type CraftId } from './Crafting';
import type { DropSystem } from './DropSystem';
import { isEquipKind, type EquipSlot } from './Equipment';
import { itemSortIndex } from './Items';
import type { ResourceKind } from './Inventory';
import type { WorkbenchSystem } from './WorkbenchSystem';

/** Inventory, equipment and crafting commands shared by local UI and host action dispatch. */
export class PlayerCommandController {
  constructor(
    private readonly guest: NetGuest | null,
    private readonly drops: DropSystem,
    private readonly workbench: WorkbenchSystem,
    private readonly asleep: (actor: PlayerSession) => boolean
  ) {}

  dropItem(kind: ResourceKind, count: number, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('dropItem', [kind, count]);
    if (this.asleep(actor)) return false;
    const amount = Math.min(count, actor.inventory.count(kind));
    if (amount <= 0) return false;
    actor.inventory.remove(kind, amount);
    this.drops.drop(kind, amount, actor);
    return true;
  }

  moveItem(from: number, to: number, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('moveItem', [from, to]);
    return actor.inventory.move(from, to);
  }

  sortInventory(actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('sortInventory', []);
    actor.inventory.sort(itemSortIndex);
    return true;
  }

  equipItem(kind: ResourceKind, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('equipItem', [kind]);
    return isEquipKind(kind) && actor.equipment.equip(kind, actor.inventory, true);
  }

  unequipItem(slot: EquipSlot, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('unequipItem', [slot]);
    return actor.equipment.unequip(slot, actor.inventory);
  }

  craftTool(id: CraftId, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('craftTool', [id]);
    if (this.asleep(actor) || this.workbench.isUpgrading(actor) || this.workbench.isDigging(actor)) return false;
    const recipe = RECIPES.find((candidate) => candidate.id === id);
    return !!recipe && recipe.station === 'hand' && actor.crafting.start(recipe);
  }

  craftAtWorkbench(id: CraftId, count: number, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('craftAtWorkbench', [id, count]);
    if (this.asleep(actor) || this.workbench.isUpgrading(actor) || this.workbench.isDigging(actor) || !this.workbench.isNear(actor)) return false;
    const recipe = RECIPES.find((candidate) => candidate.id === id);
    return !!recipe &&
      recipe.station === 'workbench' &&
      (recipe.minBenchLevel ?? 1) <= this.workbench.level(actor) &&
      actor.crafting.start(recipe, count);
  }

  upgradeWorkbench(actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('upgradeWorkbench', []);
    if (this.asleep(actor) || actor.crafting.isWorking || actor.eating.isWorking) return false;
    return this.workbench.upgrade(actor);
  }
}
