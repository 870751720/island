import type { AnimalSpecies } from './Wildlife';

export const canLasso = (species: AnimalSpecies): boolean =>
  ['sheep', 'rabbit', 'bison', 'wolf', 'bear'].includes(species);
export const isLassoPredator = (species: AnimalSpecies): boolean => species === 'wolf' || species === 'bear';
export type EscapeProgress = { elapsed: number; attempts: number };

/** 五次独立判定的累计成功率为 1 - (1 - p)^5。仅权威端推进。 */
export function advanceLassoEscape(species: AnimalSpecies, progress: EscapeProgress, delta: number, random = Math.random, cumulative = species === 'wolf' ? 0.95 : 0.99): boolean {
  if (!isLassoPredator(species) || progress.attempts >= 5) return false;
  const interval = species === 'wolf' ? 5 : 3;
  const chance = 1 - Math.pow(1 - cumulative, 1 / 5);
  progress.elapsed += delta;
  while (progress.elapsed >= interval && progress.attempts < 5) {
    progress.elapsed -= interval;
    progress.attempts++;
    if (random() < chance) return true;
  }
  return false;
}

export type LassoPoint = { x: number; y: number; z: number };
export type LassoResult = {
  animalId: number;
  escaped: boolean;
  from: LassoPoint;
  to: LassoPoint;
};
