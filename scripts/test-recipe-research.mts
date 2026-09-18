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
const { HIDDEN_RECIPES, matchResearch, validResearch } = load('src/game/systems/HiddenRecipes');
const { CookingStationSystem } = load('src/game/systems/CookingStationSystem');
const { PlaceOccupancy } = load('src/game/systems/PlaceOccupancy');
const { hasValidNetActionArgs } = load('src/game/net/ActionProtocol');
const discoveries = load('src/game/meta/RecipeDiscoveries');
const { wikiItemHidden, wikiItemName, wikiItemSearchText } = load('src/ui/wiki/itemWiki');
const { FOODS } = load('src/game/systems/Food');
const { RECIPES } = load('src/game/systems/Crafting');
const { ITEMS, itemCategory } = load('src/game/systems/Items');
const { RESEARCH_SVG } = load('src/ui/icons/ResearchIcons');
const { makeHiddenFoodModel } = load('src/game/entities/HiddenFoodModel');
const { itemSourcesOf } = load('src/ui/wiki/itemSources');
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
assert.ok(RECIPES.some((r: any) => r.id === 'researchTable' && r.minBenchLevel === 4));
assert.equal(HIDDEN_RECIPES.length, 43);
assert.equal(new Set(HIDDEN_RECIPES.map((r: any) => r.kind)).size, 43);
assert.equal(new Set(HIDDEN_RECIPES.map((r: any) => [...r.research].sort().join('|'))).size, 43);
const allKinds = HIDDEN_RECIPES.map((r: any) => r.kind);
assert.equal(hasValidNetActionArgs('syncRecipeDiscoveries', [allKinds.slice(0, 4)]), true);
assert.equal(hasValidNetActionArgs('syncRecipeDiscoveries', [allKinds]), true);
assert.equal(hasValidNetActionArgs('syncRecipeDiscoveries', [[...allKinds, 'applePie']]), false);
assert.equal(hasValidNetActionArgs('gmUnlockDiscoveries', []), true);
assert.equal(hasValidNetActionArgs('gmUnlockDiscoveries', [allKinds]), false);
assert.equal(new Set(allKinds.map((kind: string) => RESEARCH_SVG[kind])).size, 43, '每道料理具有独立图标');
for (const recipe of HIDDEN_RECIPES) {
  assert.equal(validResearch(recipe.research), true);
  assert.ok(Object.values(recipe.cost).every(n => Number.isSafeInteger(n) && Number(n) > 0));
  assert.equal(Object.keys(recipe.cost).sort().join('|'), [...recipe.research].sort().join('|'));
  assert.equal(matchResearch([...recipe.research].reverse())?.kind, recipe.kind);
  assert.equal(matchResearch([...recipe.research, 'berry']), undefined);
  const food = FOODS.find((f: any) => f.kind === recipe.kind);
  assert.equal(food.name, ITEMS[recipe.kind].name);
  assert.equal(food.eaters.length, 0, '隐藏料理不可喂动物');
  assert.equal(itemCategory(recipe.kind), '食物');
  assert.equal(wikiItemHidden(recipe.kind), true, '未发现名称不泄露');
  assert.ok(RESEARCH_SVG[recipe.kind].includes('viewBox="0 0 64 64"'));
  assert.ok(!/undefined|NaN/.test(RESEARCH_SVG[recipe.kind]));
  const model = makeHiddenFoodModel(recipe.kind);
  let draws = 0, triangles = 0;
  model.traverse((mesh: any) => {
    if (!mesh.isMesh) return;
    draws++;
    triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    assert.ok(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite));
    mesh.geometry.dispose(); mesh.material.dispose();
  });
  assert.equal(draws, 1, '静态料理合并为一次绘制');
  assert.ok(triangles < 1000, '手机低面数预算');
  assert.ok(itemSourcesOf(recipe.kind).some((s: any) => s.station === 'cookingStation' && s.inputs.length === recipe.research.length));
  const tester = actor();
  for (const kind of recipe.research) tester.inventory.add(kind, 1);
  assert.equal(research.start(tester, [...recipe.research].reverse()), true);
  research.advance(tester, 2);
  assert.equal(tester.inventory.count(recipe.kind), 1);
  assert.equal(tester.discoveredRecipes.has(recipe.kind), true);
  for (const kind of recipe.research) assert.equal(tester.inventory.count(kind), 0);

  const pot = new CookingStationSystem(new THREE.Scene(), terrain, props, fx, audio, give, new PlaceOccupancy());
  pot.restore([{ x: 0, y: 1, z: 0, fuel: 100, boilQueue: 0, tickLeft: 5, outCount: 0 }]);
  const chef = actor();
  for (const [kind, n] of Object.entries(recipe.cost)) chef.inventory.add(kind, Number(n) * 2);
  assert.equal(pot.startBoil(chef, recipe.kind, 2), 'invalid', '任何新料理均需先发现');
  chef.discoverRecipe(recipe.kind);
  assert.equal(pot.startBoil(chef, recipe.kind, 2), 'ok');
  assert.equal(pot.startBoil(chef, recipe.kind, 2), 'invalid', '重复请求不额外扣料');
  pot.update(5, 5, true);
  assert.equal(pot.nearbyInfo(chef).outKind, recipe.kind);
  assert.equal(pot.takeBoil(chef), true);
  for (const [kind, n] of Object.entries(recipe.cost)) assert.equal(chef.inventory.count(kind), n, '退回一份未完成料理的全部材料');
  assert.equal(pot.collect(chef), 'ok');
  assert.equal(chef.inventory.count(recipe.kind), 1);
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

// 执行实际 GM 方法，隔离渲染器构造；动作分发仍使用正式注册表。
const gameSource = ts.createSourceFile('Game.ts', fs.readFileSync('src/game/Game.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const gameClass = gameSource.statements.find(ts.isClassDeclaration)!;
const gmMethod = gameClass.members.find(m => m.name?.getText(gameSource) === 'gmUnlockDiscoveries')!;
const gmCode = ts.transpileModule(`module.exports = class { ${gmMethod.getText(gameSource)} }`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const gmModule = { exports: {} as any };
vm.runInNewContext(gmCode, { module: gmModule, HIDDEN_RECIPES });
const host = actor(), guest = actor();
const notices: any[] = [];
const gmGame: any = { local: host, guestNet: null, notify: (...args: any[]) => notices.push(args), gmUnlockDiscoveries: gmModule.exports.prototype.gmUnlockDiscoveries };
const { dispatchNetAction } = load('src/game/net/Actions');
assert.equal(dispatchNetAction(gmGame, guest, 'gmUnlockDiscoveries', []), true);
assert.equal(guest.discoveredRecipes.size, 43);
assert.equal(host.discoveredRecipes.size, 0, '客人 GM 不修改房主收藏');
assert.equal(notices[0][1], guest);
assert.equal(guest.inventory.snapshot().filter(Boolean).length, 0, 'GM 不发放物品');
assert.equal(dispatchNetAction(gmGame, guest, 'gmUnlockDiscoveries', []), true);
assert.equal(guest.discoveredRecipes.size, 43, '重复解锁幂等');
const sent: any[] = [];
gmGame.guestNet = { action: (...args: any[]) => { sent.push(args); return true; } };
assert.equal(gmGame.gmUnlockDiscoveries(), true);
assert.equal(sent[0][0], 'gmUnlockDiscoveries');
assert.equal(host.discoveredRecipes.size, 0, '客人发送时不抢先解锁');
gmGame.guestNet.action = () => false;
assert.equal(gmGame.gmUnlockDiscoveries(), false);
assert.equal(host.discoveredRecipes.size, 0, '断线发送失败也不本地解锁');

discoveries.rememberRecipes([...guest.discoveredRecipes]);
assert.equal(discoveries.loadRecipeDiscoveries().length, 43);
assert.equal(Object.keys(ITEMS).some(wikiItemHidden), false, 'GM 后全部图鉴条目可见');
cache.delete(path.resolve('src/game/meta/RecipeDiscoveries.ts'));
assert.equal(load('src/game/meta/RecipeDiscoveries').loadRecipeDiscoveries().length, 43, '全部收藏跨会话保留');
const fullBackup = captureBundle();
assert.equal(JSON.parse(fullBackup.entries['island.recipe-discoveries.v1']).length, 43);

const fullActor = actor();
const lastRecipe = HIDDEN_RECIPES[42];
fullActor.inventory.load(lastRecipe.research.map((kind: string) => ({ kind, count: 2 })), 4);
const drops: string[] = [];
const fullResearch = new ResearchTableSystem({ ...deps, give: (kind: string, n: number, target: any) => {
  const packed = target.inventory.add(kind, n);
  if (!packed) drops.push(kind);
  return packed;
} }, () => {});
fullResearch.restore([{ kind: 'researchTable', x: 0, y: 1, z: 0 }]);
assert.equal(fullResearch.start(fullActor, lastRecipe.research), true);
fullActor.research = JSON.parse(JSON.stringify(fullActor.research));
fullResearch.advance(fullActor, 2);
fullResearch.advance(fullActor, 2);
assert.equal(drops.join(','), lastRecipe.kind, '满包研究与读档恢复只结算一次掉落');
assert.equal(fullActor.discoveredRecipes.has(lastRecipe.kind), true);
console.log('PASS: research timing, costs, cooldown, known combinations, independent discoveries, world sync, cooking refunds, host authority and global wiki discovery');
console.log('PASS: 43 recipes, mobile model budget, unique icons, GM actor isolation, protocol limits, full collections and full-bag recovery');
