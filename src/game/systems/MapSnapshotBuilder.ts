import type { MapSnapshot } from '../GameContracts';
import type { PlayerSession } from '../mp/PlayerSession';
import type { IslandTerrain } from '../world/IslandTerrain';

const MAP_COLUMNS = 100;
const MAP_ROWS = 500;

/** 将固定地形采样为小地图像素；结果可在整局游戏内缓存。 */
export function buildMapTerrain(terrain: IslandTerrain): MapSnapshot['terrain'] {
  const pixels = new Uint8Array(MAP_COLUMNS * MAP_ROWS);
  for (let row = 0; row < MAP_ROWS; row++) {
    const z = -terrain.halfLength + ((row + 0.5) / MAP_ROWS) * terrain.length;
    for (let column = 0; column < MAP_COLUMNS; column++) {
      const x = -terrain.halfWidth + ((column + 0.5) / MAP_COLUMNS) * terrain.width;
      const water = terrain.getWaterKind(x, z);
      const height = terrain.getHeight(x, z);
      pixels[row * MAP_COLUMNS + column] =
        water === 'pond' ? 4 : water === 'sea' ? 0 : height < 0.05 ? 1 : height < 1.8 ? 2 : 3;
    }
  }
  return { columns: MAP_COLUMNS, rows: MAP_ROWS, pixels };
}

/** 组装小地图即时状态；玩家与设施数据在客人端已经过房主快照对账。 */
export function buildMapSnapshot(
  terrain: IslandTerrain,
  mapTerrain: MapSnapshot['terrain'],
  localPlayerId: string,
  sessions: readonly PlayerSession[],
  workbenches: MapSnapshot['workbenches'],
): MapSnapshot {
  return {
    island: { width: terrain.width, length: terrain.length },
    terrain: mapTerrain,
    localPlayerId,
    players: sessions.map((session) => ({
      id: session.id,
      name: session.name,
      x: session.player.group.position.x,
      z: session.player.group.position.z,
      dead: session.survival.state.dead,
    })),
    workbenches,
  };
}
