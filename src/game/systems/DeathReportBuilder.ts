import type { PlayerSession } from '../mp/PlayerSession';
import { MetaProgress, legacyPointsForDay } from '../meta/MetaProgress';
import type { DeathReport } from './RunStats';
import type { SaveData } from './SaveSystem';

/** 结算单机本局战绩，并将本局求生心得写入局外进度。 */
export function buildDeathReport(
  save: SaveData,
  session: PlayerSession,
  scene: string | null
): DeathReport {
  const built =
    save.campfires.length +
    save.workbenches.length +
    save.crates.length +
    save.baitBarrels.length +
    save.waterPurifiers.length +
    save.smelters.length +
    save.cookingStations.length +
    save.looms.length +
    save.fences.length +
    save.fenceGates.length +
    save.beds.length +
    save.shrines.length +
    save.stakes.length;
  const legacyPoints = legacyPointsForDay(save.day);
  if (legacyPoints > 0) MetaProgress.grant(legacyPoints);
  return {
    day: save.day,
    cause: session.survival.deathCause ?? 'animal',
    kills: session.stats.kills,
    collected: session.stats.collected,
    crafted: session.craftedIds.size,
    built,
    legacyPoints,
    scene,
  };
}
