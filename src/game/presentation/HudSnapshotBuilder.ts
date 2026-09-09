import type { PlayerSession } from '../mp/PlayerSession';
import type { HudSnapshot } from '../GameContracts';
import { AUTO_EQUIP_DELAY, TETHER_RANGE } from '../GameConfig';
import { BUFFS, type HudBuff } from '../systems/BuffSystem';
import type { AutoPlaceSystem } from '../systems/AutoPlace';
import type { BedSystem } from '../systems/BedSystem';
import type { BaitBarrelSystem } from '../systems/BaitBarrelSystem';
import type { BrewBarrelSystem } from '../systems/BrewBarrelSystem';
import type { CampfireSystem } from '../systems/CampfireSystem';
import type { CookingStationSystem } from '../systems/CookingStationSystem';
import type { CrateSystem } from '../systems/CrateSystem';
import type { DayNightSystem } from '../systems/DayNightSystem';
import type { DropSystem } from '../systems/DropSystem';
import type { LoomSystem } from '../systems/LoomSystem';
import type { ResourceKind } from '../systems/Inventory';
import type { ShrineSystem } from '../systems/ShrineSystem';
import type { SmelterSystem } from '../systems/SmelterSystem';
import type { WeatherSystem } from '../systems/WeatherSystem';
import type { WorkbenchSystem } from '../systems/WorkbenchSystem';
import type { Wildlife } from '../entities/Wildlife';

type HudSystems = {
  autoPlace: AutoPlaceSystem;
  wildlife: Wildlife;
  crates: CrateSystem;
  baitBarrels: BaitBarrelSystem;
  brewBarrels: BrewBarrelSystem;
  smelters: SmelterSystem;
  cookingStations: CookingStationSystem;
  looms: LoomSystem;
  beds: BedSystem;
  workbench: WorkbenchSystem;
  campfire: CampfireSystem;
  shrines: ShrineSystem;
  drops: DropSystem;
  dayNight: DayNightSystem;
  weather: WeatherSystem;
};

export type HudRuntime = {
  autoEquipTimer: number;
  respawnEnabled: boolean;
  poseidonGrace: boolean;
  collectTreasure: ResourceKind | null;
};

export class HudSnapshotBuilder {
  constructor(
    private readonly systems: HudSystems,
    private readonly placeables: (session: PlayerSession) => { kind: ResourceKind; count: number }[],
    private readonly indicator: (session: PlayerSession) => HudSnapshot['indicator']
  ) {}

  build(session: PlayerSession, busy: boolean, runtime: HudRuntime): Omit<HudSnapshot, 'notice'> {
    const s = this.systems;
    const leading = s.wildlife.leashedBy(session.player) !== null;
    return {
      ...session.survival.state,
      arrow: session.ammo.count('arrow'),
      bait: session.ammo.count('bait'),
      heldFenceCount: session.player.currentTool === 'fence'
        ? session.inventory.count('fenceWood') + session.inventory.count('fenceStone')
        : session.player.currentTool === 'fenceGate' ? session.inventory.count('fenceGate') : 0,
      heldPlaceCount: s.autoPlace.heldCount(session),
      heldItemKind: s.autoPlace.heldKind(session),
      placeables: this.placeables(session),
      slots: session.inventory.snapshot(),
      capacity: session.inventory.capacity,
      hasAxe: !!session.tools.axe,
      hasPickaxe: !!session.tools.pickaxe,
      hasShovel: !!session.tools.shovel,
      hasFishingrod: !!session.tools.fishingrod,
      hasBow: !!session.tools.bow,
      hasSword: !!session.tools.sword,
      hasLasso: session.inventory.count('lasso') > 0 || leading,
      lassoCount: session.inventory.count('lasso'),
      leading,
      nearTether: s.wildlife.stakedNear(session.player.group.position, TETHER_RANGE) !== null,
      toolTiers: { ...session.tools },
      craftedIds: [...session.craftedIds],
      nearCrate: !!s.crates.nearby(session),
      nearBaitBarrel: !!s.baitBarrels.nearby(session),
      nearBrewBarrel: !!s.brewBarrels.nearby(session),
      nearSmelter: !!s.smelters.nearby(session),
      nearLoom: !!s.looms.nearby(session),
      nearBed: !!s.beds.nearby(session),
      bedSleeping: s.beds.isSleeping(session),
      bedSleepProgress: s.beds.getSleepProgress(session) ?? 0,
      crateSlots: s.crates.nearbySlots(session),
      crateCapacity: s.crates.nearbyCapacity(session),
      baitBarrelInfo: s.baitBarrels.nearbyInfo(session),
      brewBarrelInfo: s.brewBarrels.nearbyInfo(session),
      smelterInfo: s.smelters.nearbyInfo(session),
      nearCookingStation: !!s.cookingStations.nearby(session),
      cookingStationInfo: s.cookingStations.nearbyInfo(session),
      loomInfo: s.looms.nearbyInfo(session),
      equipped: session.equipment.snapshot(),
      gender: session.player.currentGender,
      tool: session.player.currentTool,
      craftId: session.crafting.currentRecipe?.id ?? null,
      craftProgress: session.crafting.getProgress() ?? 0,
      workbenchCrafted: s.workbench.hasCrafted,
      campfirePlaced: s.campfire.count > 0 || s.cookingStations.count > 0,
      workbenchProgress: s.workbench.getProgress(session) ?? 0,
      workbenchLevel: s.workbench.level(session),
      nearWorkbench: s.workbench.isNear(session),
      campfireProgress: s.campfire.getProgress(session) ?? 0,
      nearCampfire: !!s.campfire.nearby(session),
      campfireInfo: s.campfire.getCampfireInfo(session),
      eatName: session.eating.currentFood?.name ?? null,
      eatProgress: session.eating.getProgress() ?? 0,
      autoEquipProgress: runtime.autoEquipTimer > 0 ? runtime.autoEquipTimer / AUTO_EQUIP_DELAY : 0,
      respawnLeft: session.survival.state.dead && runtime.respawnEnabled ? session.respawnLeft : null,
      poseidonGrace: runtime.poseidonGrace && session.survival.state.dead,
      canFish: session.fishing.canStart(),
      fishingState: session.fishing.currentState,
      fishingProgress: session.fishing.getProgress() ?? 0,
      fishingTier: session.fishing.lootTier,
      fishingWaitLeft: session.fishing.waitLeft,
      biteActive: session.fishing.currentState === 'bite',
      biteClicks: session.fishing.biteClicks,
      biteNeed: session.fishing.biteNeed,
      treasureKind: session.fishing.treasureLoot,
      collectTreasure: runtime.collectTreasure,
      nearDrop: s.drops.getNearby(session),
      day: s.dayNight.day,
      busy,
      moving: session.player.isMoving,
      indicator: this.indicator(session),
      buffs: this.buffsFor(session),
    };
  }

  private buffsFor(session: PlayerSession): HudBuff[] {
    const list: HudBuff[] = [];
    const shrines = this.systems.shrines;
    if (shrines.blessed) list.push({ ...BUFFS.poseidon, remain: null });
    if (shrines.berryBlessed) list.push({ ...BUFFS.beehive, remain: null });
    const position = session.player.group.position;
    if (shrines.inAura('healCrystal', position)) list.push({ ...BUFFS.healCrystal, remain: null });
    if (shrines.inAura('rainAltar', position)) list.push({ ...BUFFS.rainAltar, remain: null });
    if (this.systems.weather.rainIntensity > 0.5) list.push({ ...BUFFS.rainBlessing, remain: null });
    if (session.player.slowSeconds > 0) list.push({ ...BUFFS.bearSlow, remain: Math.ceil(session.player.slowSeconds) });
    if (session.player.refreshSeconds > 0) list.push({ ...BUFFS.refresh, remain: Math.ceil(session.player.refreshSeconds) });
    if (session.player.tipsySeconds > 0) list.push({ ...BUFFS.tipsy, remain: Math.ceil(session.player.tipsySeconds) });
    return list;
  }
}
