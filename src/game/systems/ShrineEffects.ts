import type { Vector3 } from 'three';
import type { Facility } from '../entities/Facility';
import type { ShrineKind } from '../entities/Shrine';

export const SHRINE_JUNK_CUT = 1;
export const SHRINE_AURA_RANGE = 30;

/** 神龛祝福只读取设施状态，不负责放置、回收或火把照明。 */
export class ShrineEffects {
  constructor(private readonly entities: () => readonly Facility[]) {}

  private has(kind: ShrineKind): boolean { return this.entities().some((entity) => entity.kind === kind); }
  get blessed(): boolean { return this.has('poseidonBlessing'); }
  get junkCut(): number { return this.blessed ? SHRINE_JUNK_CUT : 0; }
  get berryBlessed(): boolean { return this.has('beehiveShrine'); }

  inAura(kind: 'healCrystal' | 'rainAltar' | 'crocIncense', position: Vector3): boolean {
    return this.entities().some((entity) => entity.kind === kind &&
      Math.hypot(entity.group.position.x - position.x, entity.group.position.z - position.z) <= SHRINE_AURA_RANGE);
  }
}
