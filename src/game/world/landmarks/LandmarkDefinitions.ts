import type { ResourceKind, InventorySlot } from '../../systems/Inventory';
import type { CropKind } from '../../entities/Crop';
import type { ShrineKind } from '../../entities/Shrine';

export const LANDMARKS = [
  { kind: 'camp', name: '废弃营地', weight: 14 },
  { kind: 'fishing', name: '渔人营地', weight: 14 },
  { kind: 'farm', name: '农家小院', weight: 12 },
  { kind: 'hunter', name: '猎人营地', weight: 8 },
  { kind: 'workshop', name: '废弃工坊', weight: 6 },
  { kind: 'brewery', name: '酿酒小院', weight: 6 },
  { kind: 'village', name: '湖畔村落', weight: 20 },
  { kind: 'seaRuin', name: '海神遗迹', weight: 6 },
  { kind: 'harvestRuin', name: '丰收遗迹', weight: 5 },
  { kind: 'healingRuin', name: '治愈遗迹', weight: 4 },
  { kind: 'rainRuin', name: '雨神遗迹', weight: 2 },
  { kind: 'incenseRuin', name: '驱兽遗迹', weight: 3 },
] as const;
export type LandmarkKind = typeof LANDMARKS[number]['kind'];
export type LandmarkChoice = LandmarkKind | 'random';
export function isLandmarkChoice(value: unknown): value is LandmarkChoice {
  return value === 'random' || LANDMARKS.some(d => d.kind === value);
}
export function rollLandmark(rng = Math.random): LandmarkKind {
  let roll = rng() * LANDMARKS.reduce((n, d) => n + d.weight, 0);
  return LANDMARKS.find(d => (roll -= d.weight) < 0)?.kind ?? 'camp';
}
/** 互斥百分比，剩余部分为零处；不按权重归一化。 */
export function validLandmarkChances(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 3
    && value.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100)
    && value.reduce((a, b) => a + b, 0) <= 100;
}
export function rollLandmarkCount(chances: readonly number[], rng = Math.random): number {
  let roll = rng() * 100;
  for (let i = 0; i < 3; i++) if ((roll -= chances[i]) < 0) return i + 1;
  return 0;
}

type PartKind = 'bed' | 'fire' | 'crate' | 'bench' | 'bait' | 'brew' | 'smelter' | 'loom' | 'fence' | 'gate' | 'torch' | 'shrine' | 'crop';
export type LandmarkPart = {
  type: PartKind; x: number; z: number; rotation?: number;
  level?: number; stone?: boolean; shrine?: ShrineKind; crop?: CropKind; loot?: InventorySlot[];
};
export type LandmarkBlueprint = { kind: LandmarkKind; radius: number; parts: LandmarkPart[] };

/** 固定生活布局搭配随机作物和物资；一米围栏闭合成院，正面留两米门带。 */
export function landmarkBlueprint(kind: LandmarkKind, rng = Math.random): LandmarkBlueprint {
  const parts: LandmarkPart[] = [];
  const add = (type: PartKind, x: number, z: number, extra: Partial<LandmarkPart> = {}) => parts.push({ type, x, z, ...extra });
  const loot = (...items: [ResourceKind, number][]): InventorySlot[] => items.map(([kind, count]) => ({ kind, count }));
  const enclosure = (x: number, z: number, stone = false) => {
    for (let offset = -6; offset <= 6; offset++) {
      add('fence', x + offset, z - 6, { stone });
      // 门自带两个端柱，中间不放围栏，防止横杆封住入口。
      if (Math.abs(offset) > 1) add('fence', x + offset, z + 6, { stone });
      if (offset > -6 && offset < 6) {
        add('fence', x - 6, z + offset, { stone });
        add('fence', x + 6, z + offset, { stone });
      }
    }
    add('gate', x - 1, z + 6);
  };
  const garden = (x: number, z: number) => {
    const crops: CropKind[] = ['carrot', 'wheat', 'potato', 'corn'];
    const crop = crops[Math.floor(rng() * crops.length)];
    for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 2; dz++) add('crop', x + dx, z + dz, { crop });
  };
  const yard = (x: number, z: number, role: LandmarkKind) => {
    add('bed', x - 3, z - 3, { level: rng() < 0.2 ? 2 : 1 });
    add('fire', x, z);
    let contents = loot(['wood', 3], ['rope', 1], ['cookedBerry', 2]);
    if (role === 'fishing') {
      add('bait', x + 3, z - 3);
      contents = loot(['bait', 5], ['sardine', 2], ['cola', 1]);
    } else if (role === 'farm') {
      garden(x + 2, z - 4);
      contents = loot(['wheatSeed', 2], ['carrotSeed', 2], ['bread', 1]);
    } else if (role === 'hunter') {
      contents = loot(['fur', 2], ['arrow', 8], ['cookedGameMeat', 1]);
      if (rng() < 0.15) contents.push({ kind: 'adventureBook', count: 1 });
    } else if (role === 'workshop') {
      add('bench', x + 3, z - 3, { level: 1 });
      const smelt = rng() < 0.5;
      add(smelt ? 'smelter' : 'loom', x + 3, z + 1);
      contents = smelt ? loot(['ironOre', 3], ['flint', 2]) : loot(['rope', 3], ['cloth', 1]);
    } else if (role === 'brewery') {
      add('brew', x + 3, z - 3);
      contents = loot(['fruitFruit', 3], ['berry', 3], ['wineBerry', 1]);
    }
    add('crate', x - 3, z + 2, { loot: contents });
    enclosure(x, z);
    add('torch', x + 5, z + 4);
  };
  if (kind === 'village') {
    yard(-8, -6, 'farm');
    yard(8, -6, 'fishing');
    yard(0, 10, rng() < 0.5 ? 'camp' : 'workshop');
    add('bench', 0, -4, { level: 1 });
    return { kind, radius: 22, parts };
  }
  const shrineKinds: Partial<Record<LandmarkKind, ShrineKind>> = {
    seaRuin: 'poseidonBlessing', harvestRuin: 'beehiveShrine', healingRuin: 'healCrystal',
    rainRuin: 'rainAltar', incenseRuin: 'crocIncense',
  };
  const shrine = shrineKinds[kind];
  if (shrine) {
    add('shrine', 0, -2, { shrine });
    enclosure(0, 0, true);
    add('torch', -3, 3); add('torch', 3, 3);
    add('crate', 4, -3, { loot: loot(['stone', 3], ['flint', 2]) });
    if (kind === 'harvestRuin') garden(-4, -3);
    return { kind, radius: 10, parts };
  }
  yard(0, 0, kind);
  return { kind, radius: 10, parts };
}
