import type { CropKind } from '../../entities/Crop';
import type { InventorySlot, ResourceKind } from '../../systems/Inventory';
import type { LandmarkPart } from './LandmarkDefinitions';

/** 模板的公共摆放工具；所有地点最多拥有一张一级床。 */
export class LandmarkBuilder {
  readonly parts: LandmarkPart[] = [];
  constructor(readonly random: () => number) {}
  add(type: Exclude<LandmarkPart['type'], 'bed'>, x: number, z: number, extra: Partial<Omit<LandmarkPart, 'type' | 'x' | 'z'>> = {}) {
    this.parts.push({ ...extra, type, x, z });
  }
  bed(x: number, z: number, rotation = 0) {
    if (this.parts.some(part => part.type === 'bed')) throw new Error('每处地点最多一张床');
    this.parts.push({ type: 'bed', x, z, rotation, level: 1 });
  }
  line(x: number, z: number, dx: number, dz: number, count: number, stone = false) {
    for (let i = 0; i < count; i++) this.add('fence', x + dx * i, z + dz * i, { stone });
  }
  plot(x: number, z: number, width: number, depth: number, crop: CropKind) {
    for (let dx = 0; dx < width; dx++) for (let dz = 0; dz < depth; dz++) this.add('crop', x + dx, z + dz, { crop });
  }
  crate(x: number, z: number, items: [ResourceKind, number][], extra: InventorySlot[] = []) {
    this.add('crate', x, z, { loot: [...items.map(([kind, count]) => ({ kind, count })), ...extra] });
  }
}
