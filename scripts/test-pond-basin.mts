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
const { IslandTerrain } = require('../src/game/world/IslandTerrain.ts');
const { getPondBasinHeight } = require('../src/game/world/PondBasin.ts');
assert.equal(getPondBasinHeight(-1, 0, 1, 1.6, -0.25), -1, '不能抬高低地');
assert.equal(getPondBasinHeight(3, 1, 1, 1.6, -0.25), 3, '坑边接回原地形');
assert.ok(Math.abs(getPondBasinHeight(3, 1 - 1e-6, 1, 1.6, -0.25) - 3) < 1e-6);
let total = 0;
let smallest = Infinity;
let minimumCoverage = 1;
for (const seed of [1, 42, 123, 456, 789]) {
  const terrain = new IslandTerrain(200, 1000, seed);
  const mirror = new IslandTerrain(200, 1000, seed);
  assert.deepEqual(terrain.waterAreas, mirror.waterAreas, '主客水洼参数一致');
  assert.deepEqual(terrain.mesh.geometry.attributes.position.array,
    mirror.mesh.geometry.attributes.position.array, '主客地形一致');
  for (const pond of terrain.waterAreas) {
    let footprint = 0;
    let wet = 0;
    for (let x = pond.x - pond.radius; x <= pond.x + pond.radius; x += 0.25) {
      for (let z = pond.z - pond.radius; z <= pond.z + pond.radius; z += 0.25) {
        const distance = terrain.pondDist(pond, x, z);
        const height = terrain.getHeight(x, z);
        if (distance >= 1) continue;
        assert.ok(height >= terrain.seaLevel + 0.099, '海面不能穿入洼底');
        if (distance >= 0.96) continue;
        footprint += 0.0625;
        if (terrain.getWaterKind(x, z) === 'pond') wet += 0.0625;
      }
    }
    for (let i = 0; i < 360; i++) {
      const angle = i * Math.PI / 180;
      const radius = pond.radius + 2.6;
      assert.ok(terrain.getHeight(pond.x + Math.cos(angle) * radius,
        pond.z + Math.sin(angle) * radius) > pond.waterY, '外围必须有封闭干岸');
    }
    assert.ok(wet >= 30, `seed ${seed}: 水面过小 ${wet}`);
    assert.ok(wet / footprint >= 0.6, `seed ${seed}: 水面覆盖不足 ${wet / footprint}`);
    smallest = Math.min(smallest, wet);
    minimumCoverage = Math.min(minimumCoverage, wet / footprint);
    total++;
  }
  for (const world of [terrain, mirror]) {
    world.disposeWater();
    world.mesh.geometry.dispose();
    world.mesh.material.dispose();
  }
}
console.log(`水洼检查通过: ${total} 处, 最小水面 ${smallest.toFixed(1)} 平方米, 最低覆盖 ${(minimumCoverage * 100).toFixed(1)}%`);
