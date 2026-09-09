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
    (save.baitBarrels?.length ?? 0) +
    (save.waterPurifiers?.length ?? 0) +
    (save.smelters?.length ?? 0) +
    (save.cookingStations?.length ?? 0) +
    (save.looms?.length ?? 0) +
    save.fences.length +
    save.fenceGates.length +
    save.beds.length +
    (save.shrines?.length ?? 0) +
    (save.stakes?.length ?? 0);
  const legacyPoints = legacyPointsForDay(save.day ?? 1);
  if (legacyPoints > 0) MetaProgress.grant(legacyPoints);
  return {
    day: save.day ?? 1,
    cause: session.survival.deathCause ?? 'animal',
    kills: session.stats.kills,
    collected: session.stats.collected,
    crafted: session.craftedIds.size,
    built,
    legacyPoints,
    scene,
  };
}
