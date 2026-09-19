import * as THREE from 'three';
import type { Props } from '../world/Props';
import type { AnimalFoodSource, FoodTarget } from './AnimalFood';
import { FOOD_SEARCH_RADIUS, type TameSpecies } from './AnimalHusbandry';
import { GRAZING_HEART, BERRY_BUSH_HEART } from './HusbandryFood';
import { clearFoodPath, clearFoodPathSteps, foodPathSteps } from './AnimalFoodPath';
import { ForagingSearchQueue, type SearchTask } from './ForagingSearchQueue';
export { clearFoodPath } from './AnimalFoodPath';

export class AnimalForaging {
  private target: FoodTarget | null = null;
  private path: THREE.Vector3[] = [];
  private retry = 0;
  private age = 0;
  private searchCursors = [0, 0];
  private storedTarget = false;

  private pending: SearchTask | null = null;
  private searchOrigin = new THREE.Vector3();
  private searchTamed = false;
  private searchStoredAllowed = false;
  private lookAhead = new THREE.Vector3();

  constructor(private readonly searches: ForagingSearchQueue) {}

  get searching(): boolean { return this.pending !== null; }

  cancelSearch(): void {
    if (this.pending) this.searches.cancel(this.pending);
    this.pending = null;
  }

  reset(): void { this.cancelSearch(); this.target = null; this.path = []; this.retry = 0; this.age = 0; this.storedTarget = false; }

  update(delta: number, origin: THREE.Vector3, species: TameSpecies, tamed: boolean,
    sources: readonly AnimalFoodSource[], props: Props | null, allowed: (x: number, z: number) => boolean,
    move: (target: THREE.Vector3) => boolean, eat: (hunger: number) => void, allowStoredFood = true): boolean | null {
    if (this.pending && (origin.distanceToSquared(this.searchOrigin) > 0.04 || tamed !== this.searchTamed
      || allowStoredFood !== this.searchStoredAllowed)) this.reset();
    if (this.storedTarget && !allowStoredFood) this.reset();
    if (this.pending) return false;
    this.retry -= delta;
    this.age += delta;
    if (this.age > (tamed ? 90 : 20)) { this.reset(); this.retry = 1; }
    if (!this.target && this.retry <= 0) {
      this.searchOrigin.copy(origin);
      this.searchTamed = tamed;
      this.searchStoredAllowed = allowStoredFood;
      this.pending = this.searches.add(this.search(origin.clone(), species, tamed, sources, props, allowed, allowStoredFood));
      return false;
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
    // 已算出的路线可能很长；每帧只复查即将走过的一小段，避免重复全程扫描。
    if (next) this.lookAhead.copy(origin).lerp(next, Math.min(1, Math.max(0.75, delta * 2) / Math.max(0.001, origin.distanceTo(next))));
    if (!next || !clearFoodPath(origin, this.lookAhead, allowed)) { this.reset(); this.retry = 0.5; return null; }
    return move(next);
  }

  private *search(origin: THREE.Vector3, species: TameSpecies, tamed: boolean,
    sources: readonly AnimalFoodSource[], props: Props | null, allowed: (x: number, z: number) => boolean,
    allowStoredFood: boolean): Generator<void, void> {
    const range = FOOD_SEARCH_RADIUS;
    const natural: FoodTarget[] = [];
    if (tamed && props && species !== 'wolf') {
      for (const prop of props.list) {
        yield;
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
    const searchedNatural = yield* this.chooseTarget(natural, origin, allowed, range, 0);
    if (!this.target && allowStoredFood && searchedNatural) {
      const stored: FoodTarget[] = [];
      for (const source of sources) {
        yield;
        stored.push(...source.foodTargets(species, origin, range, tamed));
      }
      yield* this.chooseTarget(stored, origin, allowed, range, 1);
      this.storedTarget = !!this.target;
    }
    this.pending = null;
    this.retry = 1;
  }

  private *chooseTarget(targets: FoodTarget[], origin: THREE.Vector3, allowed: (x: number, z: number) => boolean, range: number, category: 0 | 1): Generator<void, boolean> {
    const candidates: FoodTarget[] = [];
    for (const target of targets) {
      yield;
      if (Math.hypot(target.position.x - origin.x, target.position.z - origin.z) <= range
        && allowed(target.position.x, target.position.z)) candidates.push(target);
    }
    candidates.sort((a, b) => a.position.distanceToSquared(origin) - b.position.distanceToSquared(origin));
    let direct: FoodTarget | undefined;
    for (const candidate of candidates) {
      if (yield* clearFoodPathSteps(origin, candidate.position, allowed)) { direct = candidate; break; }
    }
    const offset = this.searchCursors[category] < candidates.length ? this.searchCursors[category] : 0;
    const searchedAll = !!direct || offset + 4 >= candidates.length;
    this.searchCursors[category] = searchedAll ? 0 : offset + 4;
    for (const target of direct ? [direct] : candidates.slice(offset, offset + 4)) {
      const path = direct ? [target.position] : yield* foodPathSteps(origin, target.position, allowed, range);
      if (path) { this.target = target; this.path = path; this.age = 0; break; }
    }
    return searchedAll;
  }
}
