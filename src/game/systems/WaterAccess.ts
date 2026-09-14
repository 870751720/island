import type { IslandTerrain } from '../world/IslandTerrain';

/** 与玩家进入游泳的水深阈值共用，避免引导终点进入深水。 */
export const SWIM_DEPTH = 0.6;

export function isDrinkablePond(terrain: IslandTerrain, x: number, z: number): boolean {
  return terrain.getWaterKind(x, z) === 'pond'
    && terrain.getWaterLevel(x, z) - terrain.getHeight(x, z) <= SWIM_DEPTH;
}
