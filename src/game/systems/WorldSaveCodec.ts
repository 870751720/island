import type { Wildlife } from '../entities/Wildlife';
import type { Pomeranian } from '../entities/Pomeranian';
import type { Props } from '../world/Props';
import type { BaitBarrelSystem } from './BaitBarrelSystem';
import type { BedSystem } from './BedSystem';
import type { BrewBarrelSystem } from './BrewBarrelSystem';
import type { CampfireSystem } from './CampfireSystem';
import type { CookingStationSystem } from './CookingStationSystem';
import type { CrateSystem } from './CrateSystem';
import type { DayNightSystem } from './DayNightSystem';
import type { DropSystem } from './DropSystem';
import type { FenceSystem } from './FenceSystem';
import type { LoomSystem } from './LoomSystem';
import type { RabbitBurrowSystem } from './RabbitBurrowSystem';
import type { SaveData } from './SaveSystem';
import type { ShrineSystem } from './ShrineSystem';
import type { SoilSystem } from './SoilSystem';
import type { SmelterSystem } from './SmelterSystem';
import type { StakeSystem } from './StakeSystem';
import type { WaterPurifierSystem } from './WaterPurifierSystem';
import type { WorkbenchSystem } from './WorkbenchSystem';

export type WorldSaveSystems = {
  dayNight: DayNightSystem;
  props: Props;
  campfire: CampfireSystem;
  workbench: WorkbenchSystem;
  crates: CrateSystem;
  baitBarrels: BaitBarrelSystem;
  brewBarrels: BrewBarrelSystem;
  waterPurifiers: WaterPurifierSystem;
  burrows: RabbitBurrowSystem;
  smelters: SmelterSystem;
  cookingStations: CookingStationSystem;
  looms: LoomSystem;
  fences: FenceSystem;
  beds: BedSystem;
  shrines: ShrineSystem;
  soils: SoilSystem;
  stakes: StakeSystem;
  drops: DropSystem;
  dog: Pomeranian;
  wildlife: Wildlife;
};

export function restoreWorld(s: WorldSaveSystems, save: SaveData, guestMode: boolean): void {
  s.dayNight.restore(save.dayTime, save.day);
  s.props.applySave(save.props);
  s.campfire.restore(save.campfires);
  s.workbench.restore(save.workbenches);
  if (save.workbenchCrafted) s.workbench.restoreCrafted();
  s.crates.restore(save.crates);
  s.baitBarrels.restore(save.baitBarrels);
  s.brewBarrels.restore(save.brewBarrels);
  s.waterPurifiers.restore(save.waterPurifiers);
  s.burrows.restore(save.burrows);
  s.smelters.restore(save.smelters);
  s.cookingStations.restore(save.cookingStations);
  s.looms.restore(save.looms);
  s.fences.restore(save.fences, save.fenceGates);
  s.beds.restore(save.beds);
  s.shrines.restore(save.shrines);
  s.soils.restore(save.soils ?? []);
  s.stakes.restore(save.stakes);
  if (!guestMode) {
    for (const stake of save.stakes) s.wildlife.spawnStakedSheep(stake.x, stake.z);
  }
  s.drops.restore(save.drops);
  s.dog.restore(save.dog.x, save.dog.z);
}

export function snapshotWorld(s: WorldSaveSystems) {
  return {
    dayTime: s.dayNight.time,
    day: s.dayNight.day,
    props: s.props.snapshot(),
    campfires: s.campfire.snapshot(),
    workbenches: s.workbench.snapshot(),
    workbenchCrafted: s.workbench.hasCrafted,
    crates: s.crates.snapshot(),
    baitBarrels: s.baitBarrels.snapshot(),
    brewBarrels: s.brewBarrels.snapshot(),
    waterPurifiers: s.waterPurifiers.snapshot(),
    smelters: s.smelters.snapshot(),
    cookingStations: s.cookingStations.snapshot(),
    looms: s.looms.snapshot(),
    fences: s.fences.snapshotFences(),
    fenceGates: s.fences.snapshotGates(),
    beds: s.beds.snapshot(),
    shrines: s.shrines.snapshot(),
    soils: s.soils.snapshot(),
    stakes: s.stakes.snapshot(),
    drops: s.drops.snapshot(),
    burrows: s.burrows.snapshot(),
    dog: s.dog.snapshot(),
  };
}
