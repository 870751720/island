import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const storageMap = new Map<string, string>();
const storage = { getItem: (key: string) => storageMap.get(key) ?? null, setItem: (key: string, value: string) => storageMap.set(key, value) };
const cache = new Map<string, { exports: any }>();
function load(file: string): any {
  let resolved = path.resolve(file);
  if (!path.extname(resolved)) resolved = fs.existsSync(`${resolved}.ts`) ? `${resolved}.ts` : path.join(resolved, 'index.ts');
  if (cache.has(resolved)) return cache.get(resolved)!.exports;
  const module = { exports: {} };
  cache.set(resolved, module);
  const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, crypto: globalThis.crypto, performance, structuredClone, TextEncoder, localStorage: storage,
    require: (id: string) => id.startsWith('.') ? load(path.resolve(path.dirname(resolved), id))
      : id.startsWith('@/') ? load(`src/${id.slice(2)}`) : require(id) });
  return module.exports;
}

const THREE = require('three');
const { Inventory } = load('src/game/systems/Inventory');
const { ResearchTableSystem, emptyResearch } = load('src/game/systems/ResearchTableSystem');
const { HIDDEN_RECIPES, matchResearch } = load('src/game/systems/HiddenRecipes');
const { CookingStationSystem } = load('src/game/systems/CookingStationSystem');
const { PlaceOccupancy } = load('src/game/systems/PlaceOccupancy');
const { hasValidNetActionArgs } = load('src/game/net/ActionProtocol');
const discoveries = load('src/game/meta/RecipeDiscoveries');
const { wikiItemHidden, wikiItemName, wikiItemSearchText } = load('src/ui/wiki/itemWiki');
const { FOODS } = load('src/game/systems/Food');
const { RECIPES } = load('src/game/systems/Crafting');
const scene = new THREE.Scene();
const terrain = { getHeight: () => 1, isNearWater: () => false };
const props = { occupant: () => null };
const fx = { burst: () => {} };
const audio = { play: () => {} };
const give = (kind: string, count: number, actor: any) => actor.inventory.add(kind, count);
const deps = { scene, terrain, props, fx, give, occupancy: new PlaceOccupancy() };
function actor() {
  const a: any = { inventory: new Inventory(), player: { group: new THREE.Group(), currentTool: 'hand', isSwimming: false, isMoving: false }, survival: { state: { dead: false } }, discoveredRecipes: new Set(), research: emptyResearch() };
  a.player.group.position.y = 1;
  a.discoverRecipe = (kind: string) => a.discoveredRecipes.add(kind);
  a.inventory.onAdd = (kind: string) => { if (HIDDEN_RECIPES.some((r: any) => r.kind === kind)) a.discoverRecipe(kind); };
  return a;
}
const research = new ResearchTableSystem(deps, () => {});
research.restore([{ kind: 'researchTable', x: 0, y: 1, z: 0 }]);
const a = actor(), b = actor();
assert.equal(research.nearby(a), true);
assert.equal(hasValidNetActionArgs('researchStart', [['flour', 'flour']]), false);
assert.equal(hasValidNetActionArgs('researchStart', [[]]), false);
assert.equal(hasValidNetActionArgs('researchStart', [['flour', 'stone']]), false);
assert.equal(hasValidNetActionArgs('researchStart', [['flour', 'milk', 'berry', 'carrot', 'pepper']]), false);
assert.equal(hasValidNetActionArgs('researchStart', [['flour', 'fruitFruit']]), true);
assert.equal(hasValidNetActionArgs('syncRecipeDiscoveries', [['wood']]), false);
assert.equal(hasValidNetActionArgs('syncRecipeDiscoveries', [['applePie']]), true);
assert.ok(RECIPES.some((r: any) => r.id === 'researchTable' && r.minBenchLevel === 3));
for (const recipe of HIDDEN_RECIPES) {
  assert.equal(matchResearch([...recipe.research].reverse())?.kind, recipe.kind);
  assert.equal(matchResearch([...recipe.research, 'berry']), undefined);
  assert.ok(FOODS.find((f: any) => f.kind === recipe.kind));
  const tester = actor();
  for (const kind of recipe.research) tester.inventory.add(kind, 1);
  assert.equal(research.start(tester, [...recipe.research].reverse()), true);
  research.advance(tester, 2);
  assert.equal(tester.inventory.count(recipe.kind), 1);
  assert.equal(tester.discoveredRecipes.has(recipe.kind), true);
  for (const kind of recipe.research) assert.equal(tester.inventory.count(kind), 0);
}
a.inventory.add('flour', 5); a.inventory.add('fruitFruit', 5);
assert.equal(research.start(a, ['fruitFruit', 'flour']), true);
assert.equal(a.inventory.count('flour'), 4);
assert.equal(research.start(a, ['flour', 'fruitFruit']), false, '重复提交不重复扣料');
research.advance(a, 1.99);
assert.equal(a.inventory.count('applePie'), 0);
// 模拟面板关闭、走开和保存恢复，付过材料的研究仍然完成。
a.player.group.position.x = 20;
a.research = JSON.parse(JSON.stringify(a.research));
research.advance(a, 0.02);
assert.equal(a.inventory.count('applePie'), 1);
assert.equal(a.discoveredRecipes.has('applePie'), true);
assert.equal(b.discoveredRecipes.has('applePie'), false, '房主研究不自动解锁其他人');
a.player.group.position.x = 0;
assert.equal(research.start(a, ['flour', 'fruitFruit']), false, '已知组合不扣料');
assert.equal(a.inventory.count('flour'), 4);
assert.equal(research.start(a, ['flour']), true);
research.advance(a, 2);
assert.equal(a.research.cooldown, 5);
assert.equal(a.inventory.count('flour'), 3);
assert.equal(research.start(a, ['flour']), false);
research.advance(a, 4.9);
assert.equal(research.start(a, ['flour']), false);
research.advance(a, 0.1);
assert.equal(research.start(a, ['flour']), true);
b.inventory.add('applePie', 1);
assert.equal(b.discoveredRecipes.has('applePie'), true, '获得他人赠送的成品解锁');
const remoteWorld = new ResearchTableSystem({ ...deps, scene: new THREE.Scene() }, () => {});
remoteWorld.netApply(research.snapshot());
assert.equal(remoteWorld.nearby(b), true, '研究台随世界快照同步');
remoteWorld.netApply([]);
assert.equal(remoteWorld.nearby(b), false);

const cooking = new CookingStationSystem(scene, terrain, props, fx, audio, give, new PlaceOccupancy());
cooking.restore([{ x: 0, y: 1, z: 0, fuel: 100, boilQueue: 0, tickLeft: 5, outCount: 0 }]);
const c = actor(); c.inventory.add('flour', 20); c.inventory.add('fruitFruit', 20);
assert.equal(cooking.startBoil(c, 'applePie', 2), 'invalid', '未解锁无法绕过界面制作');
c.discoverRecipe('applePie');
assert.equal(cooking.startBoil(c, 'applePie', 2), 'ok');
assert.equal(c.inventory.count('flour'), 16);
assert.equal(c.inventory.count('fruitFruit'), 14);
cooking.update(5, 5, true);
assert.equal(cooking.nearbyInfo(c).outCount, 1);
assert.equal(cooking.takeBoil(c), true);
assert.equal(c.inventory.count('flour'), 18);
assert.equal(c.inventory.count('fruitFruit'), 17);
assert.equal(c.inventory.count('applePie'), 0, '取消返材料，不直接发未完成成品');
assert.equal(cooking.collect(c), 'ok');
assert.equal(c.inventory.count('applePie'), 1);
assert.equal(cooking.startBoil(c, 'applePie', 1), 'ok');
cooking.update(5, 10, false);
assert.equal(cooking.nearbyInfo(c).outCount, 0, '客人本地模拟不结算产物');
cooking.update(0.01, 10.01, true);
assert.equal(cooking.nearbyInfo(c).outCount, 1);
c.inventory.add('berry', 1);
assert.equal(cooking.startBoil(c, 'berry', 1), 'busy', '不同成品需先收取，防止输出串种');
assert.equal(c.inventory.count('berry'), 1);

assert.equal(wikiItemHidden('applePie'), true);
assert.equal(wikiItemName('applePie'), '待发现');
assert.equal(wikiItemSearchText('applePie').includes('苹果派'), false);
discoveries.rememberRecipes(['applePie', 'wood']);
assert.equal(wikiItemHidden('applePie'), false);
assert.equal(wikiItemName('applePie'), '苹果派');
assert.equal(JSON.parse(storage.getItem('island.recipe-discoveries.v1')!).length, 1);
// 重新加载收藏模块，证明解锁来自全局存储而非当前会话。
cache.delete(path.resolve('src/game/meta/RecipeDiscoveries.ts'));
assert.equal(load('src/game/meta/RecipeDiscoveries').hasRecipeDiscovery('applePie'), true);
storage.setItem('island.profile.v1', JSON.stringify({ name: '测试', gender: 'boy' }));
const { captureBundle, decodeBundle } = load('src/game/platform/taptap/SaveBundle');
const backup = captureBundle();
assert.equal(backup.entries['island.recipe-discoveries.v1'], storage.getItem('island.recipe-discoveries.v1'));
delete backup.entries['island.recipe-discoveries.v1'];
assert.equal(decodeBundle(JSON.stringify(backup)).entries['island.recipe-discoveries.v1'], null, '旧云备份缺省兼容');
console.log('PASS: research timing, costs, cooldown, known combinations, independent discoveries, world sync, cooking refunds, host authority and global wiki discovery');
