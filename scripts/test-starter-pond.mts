import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  (module as NodeJS.Module & { _compile(code: string, filename: string): void })._compile(code, filename);
};
const { createIslandWorld, hasStarterDrinkingApproach } = require('../src/game/world/StarterPond.ts');
const { IslandTerrain } = require('../src/game/world/IslandTerrain.ts');
const { setSeason } = require('../src/game/systems/SeasonSystem.ts');
const { resetSeasonVisuals, updateSeasonVisuals } = require('../src/game/world/SeasonVisuals.ts');

function dispose(terrain: any): void {
  terrain.disposeWater();
  terrain.mesh.geometry.dispose();
  terrain.mesh.material.dispose();
}

for (const seed of [1, 42, 123, 456, 789, 13, 17, 99, 333, 999]) {
  const world = createIslandWorld(seed, null);
  const terrain = world.terrain;
  const pond = terrain.starterPond;
  const spawn = terrain.findSpawnPoint();
  assert.ok(pond, '新档固定生成水洼');
  assert.equal(pond.x, spawn.x, '位于正北方向');
  assert.ok(spawn.z - pond.z >= 70 && spawn.z - pond.z <= 80, '洼心距出生点70～80米');
  assert.equal(pond.freezable, false, '固定淡水洼不结冰');
  assert.ok(hasStarterDrinkingApproach(terrain), '有直接可走的浅水饮水路线');
  const saved = JSON.parse(JSON.stringify({ starterPond: pond }));
  const restored = createIslandWorld(world.seed, saved).terrain;
  assert.deepEqual(restored.waterAreas, terrain.waterAreas, '读档/欢迎包保持水洼一致且不重复生成');
  assert.deepEqual(restored.mesh.geometry.attributes.position.array,
    terrain.mesh.geometry.attributes.position.array, '读档/主客地形逐顶点一致');
  const legacy = createIslandWorld(seed, {}).terrain;
  const original = new IslandTerrain(200, 1000, seed);
  assert.equal(legacy.starterPond, undefined, '旧档不补刷');
  assert.deepEqual(legacy.waterAreas, original.waterAreas);
  assert.deepEqual(legacy.mesh.geometry.attributes.position.array,
    original.mesh.geometry.attributes.position.array, '旧档原有地形不变');
  setSeason('winter', 1);
  resetSeasonVisuals();
  updateSeasonVisuals(100);
  assert.ok(hasStarterDrinkingApproach(terrain), '冬季仍能从出生点步行喝水');
  setSeason('spring', 1);
  resetSeasonVisuals();
  console.log(`seed ${seed} -> ${world.seed}: 正北 ${spawn.z - pond.z} 米, 新档/旧档/恢复/冬季检查通过`);
  for (const item of [terrain, restored, legacy, original]) dispose(item);
}
