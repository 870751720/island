import type { PlayerSession } from '../mp/PlayerSession';
import type { NetGuest } from '../net/NetGuest';
import type { ResourceKind } from './Inventory';
import type { CrateSystem } from './CrateSystem';
import type { BrewBarrelSystem } from './BrewBarrelSystem';
import type { BaitBarrelSystem } from './BaitBarrelSystem';
import type { SmelterSystem } from './SmelterSystem';
import type { LoomSystem } from './LoomSystem';
import type { CampfireSystem } from './CampfireSystem';
import type { CookingStationSystem } from './CookingStationSystem';

interface FacilitySystems {
  crates: CrateSystem;
  brewBarrels: BrewBarrelSystem;
  baitBarrels: BaitBarrelSystem;
  smelters: SmelterSystem;
  looms: LoomSystem;
  campfire: CampfireSystem;
  cookingStations: CookingStationSystem;
}

/** Keeps facility UI commands consistent across guest forwarding and host-authoritative execution. */
export class FacilityInteractionController {
  constructor(
    private readonly systems: FacilitySystems,
    private readonly guest: NetGuest | null,
    private readonly asleep: (actor: PlayerSession) => boolean,
    private readonly notify: (text: string, actor: PlayerSession) => void
  ) {}

  crateStore(kind: ResourceKind, count: number, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('crateStore', [kind, count === Infinity ? null : count]);
    if (this.asleep(actor)) return false;
    const result = this.systems.crates.store(actor, kind, count);
    if (result === 'full' && count === Infinity) {
      const label = this.systems.crates.nearbyKind(actor) === 'ironCrate' ? '铁箱' : '木箱';
      this.notify(`${label}装不下了`, actor);
    }
    return result === 'ok';
  }

  crateTake(kind: ResourceKind, count: number, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('crateTake', [kind, count === Infinity ? null : count]);
    if (this.asleep(actor)) return false;
    const result = this.systems.crates.take(actor, kind, count);
    if (result === 'full' && count === Infinity) this.notify('背包满了,装不下更多东西', actor);
    return result === 'ok';
  }

  brewBarrelFeed(kind: ResourceKind, count: number, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('brewBarrelFeed', [kind, count]);
    if (this.asleep(actor)) return false;
    if (this.systems.brewBarrels.feed(actor, kind, count)) return true;
    this.notify('桶里正在酿别的,一次只能酿一种', actor);
    return false;
  }

  brewBarrelTakeRaw(actor: PlayerSession): boolean {
    return this.take('brewBarrelTakeRaw', actor, () => this.systems.brewBarrels.takeRaw(actor));
  }

  brewBarrelCollect(actor: PlayerSession): boolean {
    return this.take('brewBarrelCollect', actor, () => this.systems.brewBarrels.collect(actor));
  }

  baitBarrelFeed(kind: ResourceKind, count: number, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('baitBarrelFeed', [kind, count]);
    if (this.asleep(actor)) return false;
    if (this.systems.baitBarrels.feed(actor, kind, count)) return true;
    this.notify('桶里装不下了', actor);
    return false;
  }

  baitBarrelTakeFoods(actor: PlayerSession): boolean {
    return this.take('baitBarrelTakeFoods', actor, () => this.systems.baitBarrels.takeFoods(actor));
  }

  baitBarrelCollect(actor: PlayerSession): boolean {
    return this.take('baitBarrelCollect', actor, () => this.systems.baitBarrels.collect(actor));
  }

  smelterFeed(count: number, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('smelterFeed', [count]);
    if (this.asleep(actor)) return false;
    if (this.systems.smelters.feed(actor, count)) return true;
    this.notify('炉里装不下了', actor);
    return false;
  }

  smelterTakeOre(actor: PlayerSession): boolean {
    return this.take('smelterTakeOre', actor, () => this.systems.smelters.takeOre(actor));
  }

  smelterCollect(actor: PlayerSession): boolean {
    return this.take('smelterCollect', actor, () => this.systems.smelters.collect(actor));
  }

  loomFeed(count: number, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('loomFeed', [count]);
    if (this.asleep(actor)) return false;
    if (this.systems.looms.feed(actor, count)) return true;
    this.notify('机里织不上了', actor);
    return false;
  }

  loomTakeRope(actor: PlayerSession): boolean {
    return this.take('loomTakeRope', actor, () => this.systems.looms.takeRope(actor));
  }

  loomCollect(actor: PlayerSession): boolean {
    return this.take('loomCollect', actor, () => this.systems.looms.collect(actor));
  }

  campfireAddFuel(kind: ResourceKind, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('campfireAddFuel', [kind]);
    return !this.asleep(actor) && this.systems.campfire.addFuel(actor, kind) > 0;
  }

  cookingAddFuel(kind: ResourceKind, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('cookingAddFuel', [kind]);
    return !this.asleep(actor) && this.systems.cookingStations.addFuel(actor, kind) > 0;
  }

  cookingRoast(kind: ResourceKind, count: number, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('cookingRoast', [kind, count]);
    return !this.asleep(actor) && this.systems.cookingStations.startRoast(actor, kind, count);
  }

  cookingBoil(kind: ResourceKind, count: number, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('cookingBoil', [kind, count]);
    if (this.asleep(actor)) return false;
    const result = this.systems.cookingStations.startBoil(actor, kind, count);
    if (result === 'notLit') this.notify('火还没点着,先添柴引火吧', actor);
    else if (result === 'busy') this.notify('锅里还在煮别的,等煮完再下锅', actor);
    return result === 'ok';
  }

  cookingCollect(actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('cookingCollect', []);
    if (this.asleep(actor)) return false;
    if (this.systems.cookingStations.collect(actor) > 0) return true;
    this.notify('还没有煮好的汤', actor);
    return false;
  }

  cookingTakeBoil(actor: PlayerSession): boolean {
    return this.take('cookingTakeBoil', actor, () => this.systems.cookingStations.takeBoil(actor));
  }

  campfireCook(kind: ResourceKind, count: number, actor: PlayerSession): boolean {
    if (this.guest) return this.guest.action('campfireCook', [kind, count]);
    return !this.asleep(actor) && this.systems.campfire.startCooking(actor, kind, count);
  }

  private take(action: 'brewBarrelTakeRaw' | 'brewBarrelCollect' | 'baitBarrelTakeFoods' | 'baitBarrelCollect' | 'smelterTakeOre' | 'smelterCollect' | 'loomTakeRope' | 'loomCollect' | 'cookingTakeBoil', actor: PlayerSession, operation: () => boolean): boolean {
    if (this.guest) return this.guest.action(action, []);
    if (this.asleep(actor)) return false;
    if (operation()) return true;
    this.notify('背包满了,装不下更多东西', actor);
    return false;
  }
}
