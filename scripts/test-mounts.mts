import assert from 'node:assert/strict';
// @ts-ignore Node直接运行TypeScript入口。
import { Equipment, EQUIPMENT } from '../src/game/systems/Equipment.ts';
import type { Inventory } from '../src/game/systems/Inventory';

// 装备不能凭空生成；下骑时背包容量不足不能吞掉坐骑。
const equipment = new Equipment();
let count = 0;
let room = true;
const inventory = {
  remove: () => { if (!count) return false; count--; return true; },
  add: () => { if (!room) return 0; count++; return 1; },
  setCapacity: () => {},
} as unknown as Inventory;
assert.equal(equipment.equip('skateboard', inventory), false);
count = 1;
assert.equal(equipment.equip('skateboard', inventory), true);
assert.equal(count, 0);
assert.equal(equipment.snapshot().mount, 'skateboard');
assert.equal(EQUIPMENT.skateboard.landSpeedMultiplier, 2.2);
room = false;
assert.equal(equipment.unequip('mount', inventory), false);
assert.equal(equipment.getEquipped('mount'), 'skateboard');
room = true;
assert.equal(equipment.unequip('mount', inventory), true);
assert.equal(count, 1);

// 新存档完整恢复，旧存档缺省坐骑为空，错误栏位不得装备滑板。
equipment.restore({ mount: 'skateboard' }, inventory);
const saved = equipment.snapshotForSave();
equipment.reset();
equipment.restore(saved, inventory);
assert.equal(equipment.getEquipped('mount'), 'skateboard');
equipment.restore({ clothing: 'grassShirt' }, inventory);
assert.equal(equipment.getEquipped('mount'), null);
assert.equal(equipment.getEquipped('clothing'), 'grassShirt');
equipment.restore({ hat: 'skateboard', mount: 'grassShirt' }, inventory);
assert.equal(equipment.getEquipped('hat'), null);
assert.equal(equipment.getEquipped('mount'), null);
console.log('Mount inventory and save compatibility checks passed.');
