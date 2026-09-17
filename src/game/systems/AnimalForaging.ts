import * as THREE from 'three';
import type { Props } from '../world/Props';
import type { AnimalFoodSource, FoodTarget } from './AnimalFood';
import type { TameSpecies } from './AnimalHusbandry';

export function clearFoodPath(from: THREE.Vector3, to: THREE.Vector3, allowed: (x: number, z: number) => boolean): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.15));
  for (let i = 1; i <= steps; i++) if (!allowed(from.x + (to.x - from.x) * i / steps, from.z + (to.z - from.z) * i / steps)) return false;
  return true;
}

/** 小范围网格寻路只在换目标时运行，避免每帧扫描资源及穿过围栏。 */
function foodPath(origin: THREE.Vector3, goal: THREE.Vector3, allowed: (x: number, z: number) => boolean): THREE.Vector3[] | null {
  if (clearFoodPath(origin, goal, allowed)) return [goal];
  const step = 0.75;
  const queue = [{ x: 0, z: 0, parent: -1 }];
  const seen = new Set(['0,0']);
  for (let i = 0; i < queue.length && i < 900; i++) {
    const node = queue[i];
    const at = new THREE.Vector3(origin.x + node.x * step, origin.y, origin.z + node.z * step);
    if (Math.hypot(at.x - goal.x, at.z - goal.z) < 1.5 && clearFoodPath(at, goal, allowed)) {
      const path = [goal];
      for (let n = i; n > 0; n = queue[n].parent) path.unshift(new THREE.Vector3(origin.x + queue[n].x * step, origin.y, origin.z + queue[n].z * step));
      return path;
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = node.x + dx, z = node.z + dz, key = `${x},${z}`;
      if (seen.has(key) || Math.hypot(x, z) * step > 17) continue;
      seen.add(key);
      const next = new THREE.Vector3(origin.x + x * step, origin.y, origin.z + z * step);
      if (clearFoodPath(at, next, allowed)) queue.push({ x, z, parent: i });
    }
  }
  return null;
}

export class AnimalForaging {
  private target: FoodTarget | null = null;
  private path: THREE.Vector3[] = [];
  private retry = 0;
  private age = 0;
  private searchCursor = 0;

  reset(): void { this.target = null; this.path = []; this.retry = 0; this.age = 0; }

  update(delta: number, origin: THREE.Vector3, species: TameSpecies, tamed: boolean,
    sources: readonly AnimalFoodSource[], props: Props | null, allowed: (x: number, z: number) => boolean,
    move: (target: THREE.Vector3) => boolean, eat: (hunger: number) => void): boolean | null {
    this.retry -= delta;
    this.age += delta;
    if (this.age > 20) { this.reset(); this.retry = 1; }
    if (!this.target && this.retry <= 0) {
      this.retry = 1;
      const targets = sources.flatMap(source => source.foodTargets(species, origin, 17));
      if (tamed && props && species !== 'wolf') {
        for (const prop of props.list) {
          const edible = prop.kind === 'berry' || (species !== 'bear' && (prop.kind === 'grass' || prop.kind === 'shrub'));
          if (!edible || !prop.ready || Math.hypot(prop.group.position.x - origin.x, prop.group.position.z - origin.z) > 17) continue;
          targets.push({ position: prop.group.position.clone(), consume: () => {
            if (!prop.ready || !props.list.includes(prop)) return 0;
            props.harvest(prop);
            return prop.kind === 'berry' ? 3 : 2;
          } });
        }
      }
      const candidates = targets.filter(t => allowed(t.position.x, t.position.z))
        .sort((a, b) => a.position.distanceToSquared(origin) - b.position.distanceToSquared(origin));
      const direct = candidates.find(t => clearFoodPath(origin, t.position, allowed));
      const rotated = candidates.length ? [...candidates.slice(this.searchCursor % candidates.length), ...candidates.slice(0, this.searchCursor % candidates.length)] : [];
      this.searchCursor += 4;
      for (const target of direct ? [direct] : rotated.slice(0, 4)) {
        const path = foodPath(origin, target.position, allowed);
        if (path) { this.target = target; this.path = path; this.age = 0; break; }
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
}
