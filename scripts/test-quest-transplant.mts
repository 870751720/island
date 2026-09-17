import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const cache = new Map<string, { exports: any }>();
function load(file: string): any {
  let resolved = path.resolve(file);
  if (!path.extname(resolved)) resolved = fs.existsSync(`${resolved}.ts`) ? `${resolved}.ts` : path.join(resolved, 'index.ts');
  if (cache.has(resolved)) return cache.get(resolved)!.exports;
  const module = { exports: {} };
  cache.set(resolved, module);
  const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, structuredClone, require: (id: string) => id.startsWith('.') ? load(path.resolve(path.dirname(resolved), id)) : id.startsWith('@/') ? load(`src/${id.slice(2)}`) : require(id) });
  return module.exports;
}

const { QuestProgress } = load('src/game/quests/QuestProgress.ts');
const { QUESTS } = load('src/game/quests/QuestDefinitions.ts');
const { nearTransplantCamp, transplantCells } = load('src/game/quests/QuestTransplant.ts');
const index = QUESTS.findIndex((q: { id: string }) => q.id === 'transplant');
assert.equal(QUESTS[index - 1].id, 'leather');
assert.equal(QUESTS[index + 1].id, 'graduate');
assert.ok(nearTransplantCamp({ x: 6, z: 0 }, [{ x: 0, z: 0, fuel: 0 }]));
assert.ok(!nearTransplantCamp({ x: 6.01, z: 0 }, [{ x: 0, z: 0 }]));
assert.equal(transplantCells({ x: 0, z: 0 }, [{ x: 0, z: 0 }], () => false).length, 0);
assert.equal(transplantCells({ x: 0, z: 0 }, [{ x: 0, z: 0 }], (x: number, z: number) => x === 2 && z === 0).length, 1);

const counts: Record<string, number> = {};
const session = {
  tools: { shovel: 1 }, craftedIds: new Set(), equipment: { snapshot: () => ({}) },
  inventory: { count: (kind: string) => counts[kind] ?? 0, snapshot: () => Object.entries(counts).map(([kind, count]) => ({ kind, count })), add: (kind: string, n: number) => { counts[kind] = (counts[kind] ?? 0) + n; return n; } },
  crafting: { currentRecipe: null }, ammo: { add: () => 0 },
};
const done = QUESTS.filter((q: { id: string }) => q.id !== 'transplant').map((q: { id: string }) => q.id);
const save = { completed: false, gathered: {}, crafted: {}, done, paid: [...done], benchLevel: 2, pending: {} };
const progress = new QuestProgress();
progress.restore(save);
progress.update(session, 0, false, false, 1);
assert.equal(progress.view.active, index);
assert.equal(progress.view.guide.action, 'dig');
assert.equal(progress.snapshot().completed, false);
progress.transplantAction('dig');
counts.berryBush = 1;
progress.update(session, 0, false, false, 1);
assert.equal(progress.view.guide.action, 'place');
delete counts.berryBush;
progress.update(session, 0, false, false, 1);
assert.equal(progress.view.guide.action, 'dig');
session.tools.shovel = 0;
progress.update(session, 0, false, false, 1);
assert.ok(progress.view.recipes.includes('shovel'));
session.tools.shovel = 1;
const guest = new QuestProgress();
guest.restore(save);
guest.update(session, 0, false, false, 1);
assert.equal(guest.view.rows[1].have, 0);
progress.transplantAction('place');
progress.update(session, 0, false, false, 1);
assert.equal(progress.view.finished, true);
assert.equal(counts.berry, 3);
assert.equal(counts.wood, 2);
const restored = new QuestProgress();
restored.restore(progress.snapshot());
restored.update(session, 0, false, false, 1);
assert.equal(counts.berry, 3);
const legacy = new QuestProgress();
legacy.restore({ ...save, completed: true });
legacy.update(session, 0, false, false, 1);
assert.equal(legacy.view.finished, true);
assert.equal(counts.berry, 3);
console.log('Transplant quest: progression, recovery, personal isolation, rewards, legacy saves and placement boundaries passed');
