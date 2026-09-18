import assert from 'node:assert/strict';
// @ts-ignore Node runs the TypeScript source directly.
import { HabitatPopulation } from '../src/game/world/HabitatPopulation.ts';

const population = new HabitatPopulation<string>();
population.add('wolf', { x: 0, z: 0 }, 2, 14, [360, 480]);
let attempts = 0, relocations = 0;
const fail = () => { attempts++; return false; };
const relocate = () => {
  relocations++;
  const home = { x: 100, z: 100 };
  for (const slot of population.slots) if (!slot.occupied) slot.home = home;
  return true;
};
population.update(0, fail, relocate);
assert.equal(attempts, 2);
population.update(9, fail, relocate);
assert.equal(attempts, 2);
population.update(1, fail, relocate);
assert.equal(relocations, 0, 'First retry must not move the habitat');
population.update(10, fail, relocate);
assert.equal(relocations, 1, 'Second retry relocates only once for shared vacancies');
assert.equal(population.slots.every(s => !s.occupied), true, 'Relocation must not create residents');
population.update(10, () => true, relocate);
assert.equal(population.slots.filter(s => s.occupied).length, 1);
population.update(15, () => true, relocate);
assert.equal(population.slots.filter(s => s.occupied).length, 2);
population.release(population.slots[0]);
assert.ok(population.slots[0].cooldown >= 360 && population.slots[0].cooldown <= 480);
population.update(500, fail, relocate);
assert.equal(relocations, 1, 'Release resets the failure streak');

const blocked = new HabitatPopulation<string>();
blocked.add('bear', { x: 0, z: 0 }, 1, 14, [600, 900]);
let searches = 0;
for (let i = 0; i < 6; i++) blocked.update(10, () => false, () => { searches++; return false; });
assert.equal(searches, 2, 'Failed relocation must retain bounded retry intervals');
assert.deepEqual(blocked.slots[0].home, { x: 0, z: 0 });
assert.equal(blocked.slots[0].occupied, false);
console.log('Habitat population retry and relocation checks passed');
