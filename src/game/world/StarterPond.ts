import { IslandTerrain, type WaterArea } from './IslandTerrain';
import { getEnclosedPondWaterLevel } from './PondPlacement';

type SavedWorld = { starterPond?: WaterArea };

function disposeTerrain(terrain: IslandTerrain): void {
  terrain.disposeWater();
  terrain.mesh.geometry.dispose();
  (terrain.mesh.material as import('three').Material).dispose();
}

/** 正北方向选址,距离按出生点到洼心的水平距离计算。 */
function selectStarterPond(terrain: IslandTerrain): WaterArea | null {
  const spawn = terrain.findSpawnPoint();
  for (const distance of [32.5, 35, 30]) {
    const x = spawn.x;
    const z = spawn.z - distance;
    const radius = 8.2;
    if (terrain.waterAreas.some(w => Math.hypot(w.x - x, w.z - z) < w.radius + radius + 2.6)) continue;
    const waterY = getEnclosedPondWaterLevel(
      x, z, radius, terrain.getHeight(x, z) - 0.5, terrain.seaLevel + 0.35,
      (px, pz) => terrain.getHeight(px, pz),
    );
    if (waterY === null) continue;
    return {
      x, z, radius, rx: 7.5, rz: 6.5, rot: 0,
      wobA2: 0.04, wobP2: 0.7, wobA3: 0.04, wobP3: 1.2, wobA4: 0, wobP4: 0,
      depth: 1.6, waterY, freezable: false,
    };
  }
  return null;
}

/** 实际三角网格上沿正北干地可走到可饮用浅水,中间不能隔海或深水。 */
export function hasStarterDrinkingApproach(terrain: IslandTerrain): boolean {
  const pond = terrain.starterPond;
  if (!pond) return false;
  const spawn = terrain.findSpawnPoint();
  const distance = spawn.z - pond.z;
  if (pond.x !== spawn.x || distance < 30 || distance > 35) return false;
  for (let step = 0; step <= distance; step += 0.25) {
    const z = spawn.z - step;
    const kind = terrain.getWaterKind(spawn.x, z);
    const depth = terrain.getWaterLevel(spawn.x, z) - terrain.getHeight(spawn.x, z);
    if (kind === 'sea' || depth > 0.45) return false;
    if (kind === 'pond' && depth >= 0.08) return Math.hypot(spawn.x - pond.x, z - pond.z) <= pond.radius;
  }
  return false;
}

/** 只有新世界选址;读档/客人欢迎包缺少字段时保持原地形,不补刷水洼。 */
export function createIslandWorld(seed: number, saved: SavedWorld | null): { terrain: IslandTerrain; seed: number } {
  if (saved) return { terrain: new IslandTerrain(200, 1000, seed, saved.starterPond), seed };
  // 出生点正北若是海湾,重新选择新岛;末次使用经过检查的保底种子。
  for (let attempt = 0; attempt <= 8; attempt++) {
    const candidateSeed = attempt === 8 ? 42 : (seed + attempt * 137.507764) % 1000;
    const base = new IslandTerrain(200, 1000, candidateSeed);
    const pond = selectStarterPond(base);
    disposeTerrain(base);
    if (!pond) continue;
    const terrain = new IslandTerrain(200, 1000, candidateSeed, pond);
    if (hasStarterDrinkingApproach(terrain)) return { terrain, seed: candidateSeed };
    disposeTerrain(terrain);
  }
  throw new Error('无法生成出生点北侧的安全饮水水洼');
}
