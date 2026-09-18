import * as THREE from 'three';
import type { Props } from '../world/Props';
import type { AnimalFoodSource, FoodTarget } from './AnimalFood';
import { HOME_RADIUS, type TameSpecies } from './AnimalHusbandry';
import { GRAZING_HEART, BERRY_BUSH_HEART } from './HusbandryFood';
import { clearFoodPath, foodPath } from './AnimalFoodPath';
export { clearFoodPath } from './AnimalFoodPath';

export class AnimalForaging {
  private target: FoodTarget | null = null;
  private path: THREE.Vector3[] = [];
  private retry = 0;
  private age = 0;
  private searchCursors = [0, 0];
  private storedTarget = false;

  reset(): void { this.target = null; this.path = []; this.retry = 0; this.age = 0; this.storedTarget = false; }

  update(delta: number, origin: THREE.Vector3, species: TameSpecies, tamed: boolean,
    sources: readonly AnimalFoodSource[], props: Props | null, allowed: (x: number, z: number) => boolean,
    move: (target: THREE.Vector3) => boolean, eat: (hunger: number) => void, allowStoredFood = true): boolean | null {
    const range = tamed ? HOME_RADIUS * 2 : 17;
    if (this.storedTarget && !allowStoredFood) this.reset();
    this.retry -= delta;
    this.age += delta;
    if (this.age > (tamed ? 90 : 20)) { this.reset(); this.retry = 1; }
    if (!this.target && this.retry <= 0) {
      this.retry = 1;
      const natural: FoodTarget[] = [];
      if (tamed && props && species !== 'wolf') {
        for (const prop of props.list) {
          const edible = prop.kind === 'berry' || (species !== 'bear' && (prop.kind === 'grass' || prop.kind === 'shrub'));
          if (!edible || !prop.ready || Math.hypot(prop.group.position.x - origin.x, prop.group.position.z - origin.z) > range) continue;
          natural.push({ position: prop.group.position.clone(), consume: () => {
            if (!prop.ready || !props.list.includes(prop)) return 0;
            props.harvest(prop);
            return prop.kind === 'berry' ? BERRY_BUSH_HEART : GRAZING_HEART;
          } });
        }
      }
      this.storedTarget = false;
      const searchedNatural = this.chooseTarget(natural, origin, allowed, range, 0);
      if (!this.target && allowStoredFood && searchedNatural) {
        const stored = sources.flatMap(source => source.foodTargets(species, origin, range, tamed));
        this.chooseTarget(stored, origin, allowed, range, 1);
        this.storedTarget = !!this.target;
      }
    }
    if (!this.target) return null;
    const at = this.target.position;
    if (!allowed(at.x, at.z)) { this.reset(); return null; }
    if (Math.hypot(at.x - origin.x, at.z - origin.z) <= 0.65 && clearFoodPath(origin, at, allowed)) {
      const hunger = this.target.consume();
      this.reset();
      if (hunger > 0) eat(hunger);
      return false;
    }
    while (this.path.length > 1 && Math.hypot(this.path[0].x - origin.x, this.path[0].z - origin.z) < 0.2) this.path.shift();
    const next = this.path[0];
    if (!next || !clearFoodPath(origin, next, allowed)) { this.reset(); this.retry = 0.5; return null; }
    return move(next);
  }

  private chooseTarget(targets: FoodTarget[], origin: THREE.Vector3, allowed: (x: number, z: number) => boolean, range: number, category: 0 | 1): boolean {
    const candidates = targets.filter(t => allowed(t.position.x, t.position.z))
      .sort((a, b) => a.position.distanceToSquared(origin) - b.position.distanceToSquared(origin));
    const direct = candidates.find(t => clearFoodPath(origin, t.position, allowed));
    const offset = this.searchCursors[category] < candidates.length ? this.searchCursors[category] : 0;
    const searchedAll = !!direct || offset + 4 >= candidates.length;
    this.searchCursors[category] = searchedAll ? 0 : offset + 4;
    for (const target of direct ? [direct] : candidates.slice(offset, offset + 4)) {
      const path = foodPath(origin, target.position, allowed, range);
      if (path) { this.target = target; this.path = path; this.age = 0; break; }
    }
    return searchedAll;
  }
}
