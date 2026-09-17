import type { Vector3 } from 'three';
import type { AnimalSpecies } from './Wildlife';
import type { HabitatSlot } from '../world/HabitatPopulation';

export const isFamilySpecies = (species: AnimalSpecies): boolean => species === 'sheep' || species === 'bison';
export type LifeState = { bornAt: number | null; readyAt: number; breeding: boolean };
export interface FamilyAnimal extends LifeState {
  id: number;
  species: AnimalSpecies;
  alive: boolean;
  alerted: boolean;
  provoked: boolean;
  leash: unknown;
  husbandry: { tamed: boolean };
  pos: Vector3;
  habitat?: HabitatSlot<AnimalSpecies>;
}
type Pair<A> = { parents: [A, A]; left: number };

/** 房主生态结算：日历控制成长与冷却，运行秒数控制出生前提示。 */
export class WildlifeLifecycle<A extends FamilyAnimal> {
  now = 1;
  private pairs: Pair<A>[] = [];

  members(animals: readonly A[], slot: HabitatSlot<AnimalSpecies>): A[] {
    return animals.filter(a => a.alive && a.species === slot.kind && a.habitat?.home === slot.home);
  }

  canReplenish(animals: readonly A[], slot: HabitatSlot<AnimalSpecies>): boolean {
    if (!isFamilySpecies(slot.kind)) return true;
    return this.members(animals, slot).length < 3 && !this.pairs.some(p => p.parents[0].species === slot.kind && p.parents[0].habitat?.home === slot.home);
  }

  reset(): void { this.pairs = []; }

  cancel(animal: A): void {
    const pair = this.pairs.find(p => p.parents.includes(animal));
    if (!pair) return;
    for (const parent of pair.parents) {
      parent.breeding = false;
      parent.readyAt = this.now + 0.1;
    }
    this.pairs.splice(this.pairs.indexOf(pair), 1);
  }

  update(delta: number, now: number, animals: readonly A[], birth: (parent: A) => boolean, mature: (animal: A) => void = () => {}): void {
    this.now = now;
    if (delta <= 0) return;
    for (const a of animals) {
      if (!a.alive || !isFamilySpecies(a.species)) continue;
      if (a.bornAt !== null && now - a.bornAt >= 5) {
        a.bornAt = null;
        a.readyAt = now + 1;
        mature(a);
      }
    }
    const calm = (a: A): boolean => a.alive && !a.husbandry.tamed && a.bornAt === null && !a.alerted && !a.provoked && !a.leash;
    for (const pair of [...this.pairs]) {
      const [a, b] = pair.parents;
      const group = this.members(animals, a.habitat!);
      const valid = calm(a) && calm(b) && a.pos.distanceToSquared(b.pos) <= 36 && group.length < 4 && !group.some(m => m.bornAt !== null);
      pair.left -= delta;
      if (valid && pair.left > 0) continue;
      const born = valid && birth(a);
      for (const parent of pair.parents) {
        parent.breeding = false;
        parent.readyAt = now + (born ? 3 : 0.1);
      }
      this.pairs.splice(this.pairs.indexOf(pair), 1);
    }
    const visited = new Set<string>();
    for (const a of animals) {
      if (!a.habitat || !isFamilySpecies(a.species)) continue;
      const key = `${a.species}:${a.habitat.home.x}:${a.habitat.home.z}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const group = this.members(animals, a.habitat);
      if (group.length >= 4 || group.some(m => m.bornAt !== null || m.breeding)) continue;
      const adults = group.filter(m => calm(m) && now >= m.readyAt);
      for (let i = 0; i < adults.length; i++) {
        const first = adults[i];
        const second = adults.slice(i + 1).find(b => first.pos.distanceToSquared(b.pos) <= 36);
        if (!second) continue;
        first.breeding = second.breeding = true;
        this.pairs.push({ parents: [first, second], left: 5 });
        break;
      }
    }
  }
}
