import type { Vector3 } from 'three';
import type { Facility } from '../entities/Facility';
import type { ShrineKind } from '../entities/Shrine';

export const SHRINE_JUNK_CUT = 1;
export const SHRINE_AURA_RANGE = 30;

/** 神龛祝福只读取设施状态，不负责放置、回收或火把照明。 */
export class ShrineEffects {
  constructor(private readonly entities: () => readonly Facility[]) {}

  /** 按实际放置数量计层；范围光环只计入覆盖当前玩家的设施。 */
  stacks(kind: 'poseidonBlessing' | 'beehiveShrine' | 'healCrystal', position?: Vector3): number {
    const limit = kind === 'healCrystal' ? 3 : 10;
    let count = 0;
    for (const entity of this.entities()) {
      if (entity.kind !== kind) continue;
      if (kind === 'healCrystal' && (!position ||
        Math.hypot(entity.group.position.x - position.x, entity.group.position.z - position.z) > SHRINE_AURA_RANGE)) continue;
      if (++count === limit) break;
    }
    return count;
  }

  get junkCut(): number { return this.stacks('poseidonBlessing') * SHRINE_JUNK_CUT; }
  get berryBonusChance(): number { return this.stacks('beehiveShrine') * 0.1; }

  inAura(kind: 'healCrystal' | 'rainAltar' | 'crocIncense', position: Vector3): boolean {
    return this.entities().some((entity) => entity.kind === kind &&
      Math.hypot(entity.group.position.x - position.x, entity.group.position.z - position.z) <= SHRINE_AURA_RANGE);
  }
}
