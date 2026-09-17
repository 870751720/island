import type { AnimalSpecies } from './Wildlife';

/** 可选世界存档；旧档仍按原有栖息地和木桩恢复。 */
export type WildlifeSave = {
  animals: {
    species: AnimalSpecies; x: number; z: number; heading: number;
    hp: number; bornAt: number | null; readyAt: number;
    slot?: number; extra?: boolean; stake?: { x: number; z: number };
    leashEscape?: { elapsed: number; attempts: number };
    provoked: boolean;
    milkLeft: number; hasMilk: boolean;
  }[];
  slots: { index: number; cooldown: number }[];
};
