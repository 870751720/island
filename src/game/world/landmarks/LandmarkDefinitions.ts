import { LandmarkBuilder } from './LandmarkBuilder';
import { buildSettlement } from './SettlementLayouts';
import { buildRuin } from './RuinLayouts';
import { applyLandmarkVariant, type LandmarkVariant } from './LandmarkVariants';
import type { InventorySlot } from '../../systems/Inventory';
import type { CropKind } from '../../entities/Crop';
import type { ShrineKind } from '../../entities/Shrine';

export const LANDMARKS = [
  { kind: 'camp', name: '废弃营地', weight: 14 },
  { kind: 'fishing', name: '渔人营地', weight: 14 },
  { kind: 'farm', name: '农家小院', weight: 12 },
  { kind: 'hunter', name: '猎人营地', weight: 8 },
  { kind: 'workshop', name: '废弃工坊', weight: 6 },
  { kind: 'brewery', name: '酿酒小院', weight: 6 },
  { kind: 'village', name: '湖畔村落', weight: 2 },
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
export const DEFAULT_LANDMARK_CHANCES = [35, 10, 1] as const;
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
export type LandmarkBlueprint = { kind: LandmarkKind; variant: LandmarkVariant; radius: number; parts: LandmarkPart[] };

/** 生成时从三套地点模板中选取一套；床数量及等级由构建器统一约束。 */
export function landmarkBlueprint(kind: LandmarkKind, rng = Math.random, selectedVariant?: LandmarkVariant): LandmarkBlueprint {
  const variant = selectedVariant ?? Math.min(2, Math.floor(rng() * 3)) as LandmarkVariant;
  const builder = new LandmarkBuilder(rng);
  if (!buildRuin(kind, builder)) buildSettlement(kind, builder);
  applyLandmarkVariant(kind, variant, builder);
  return { kind, variant, radius: kind === 'village' ? 12 : 10, parts: builder.parts };
}
