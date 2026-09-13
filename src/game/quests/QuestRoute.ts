import type { IslandTerrain } from '../world/IslandTerrain';

type Point = { x: number; z: number };
type Node = Point & { key: string; cost: number; estimate: number; parent: Node | null };
const STEP = 2;
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** 小根堆避免远距离引导反复排序整个开放集合。 */
class Frontier {
  private nodes: Node[] = [];
  push(node: Node): void {
    this.nodes.push(node);
    let index = this.nodes.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.nodes[parent].estimate <= node.estimate) break;
      this.nodes[index] = this.nodes[parent];
      index = parent;
    }
    this.nodes[index] = node;
  }
  pop(): Node | undefined {
    const first = this.nodes[0];
    const last = this.nodes.pop();
    if (!this.nodes.length || !last) return first;
    let index = 0;
    while (index * 2 + 1 < this.nodes.length) {
      let child = index * 2 + 1;
      if (child + 1 < this.nodes.length && this.nodes[child + 1].estimate < this.nodes[child].estimate) child++;
      if (last.estimate <= this.nodes[child].estimate) break;
      this.nodes[index] = this.nodes[child];
      index = child;
    }
    this.nodes[index] = last;
    return first;
  }
}

/** 按距离尝试目标，用按需缓存的陆地网格寻路；不让特效线直接横穿海和水洼。 */
export class QuestRoute {
  private dry = new Map<string, boolean>();
  private cacheAge = 0;
  constructor(private terrain: IslandTerrain) { }

  private isDry(x: number, z: number): boolean {
    const key = `${x},${z}`;
    const cached = this.dry.get(key);
    if (cached !== undefined) return cached;
    const ok = Math.abs(x) < this.terrain.halfWidth && Math.abs(z) < this.terrain.halfLength
      && this.terrain.getWaterKind(x, z) === null;
    this.dry.set(key, ok);
    return ok;
  }

  private segmentDry(a: Point, b: Point): boolean {
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      if (!this.isDry(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }

  private anchor(point: Point): Point | null {
    const center = { x: Math.round(point.x / STEP) * STEP, z: Math.round(point.z / STEP) * STEP };
    const options: Point[] = [];
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) options.push({ x: center.x + x * STEP, z: center.z + z * STEP });
    options.sort((a, b) => (a.x - point.x) ** 2 + (a.z - point.z) ** 2 - ((b.x - point.x) ** 2 + (b.z - point.z) ** 2));
    return options.find(p => this.segmentDry(point, p)) ?? null;
  }

  find(origin: Point, targets: Point[], delta: number): Point[] | null {
    this.cacheAge += delta;
    if (this.cacheAge > 10) {
      this.dry.clear();
      this.cacheAge = 0;
    }
    if (!targets.length || !this.isDry(origin.x, origin.z)) return null;
    const start = this.anchor(origin);
    if (!start) return null;
    const distance = (p: Point) => (p.x - origin.x) ** 2 + (p.z - origin.z) ** 2;
    const candidates = targets.filter(p => this.isDry(p.x, p.z)).sort((a, b) => distance(a) - distance(b));
    // 每次搜索预算有上限，避免孤立物资导致手机长帧；下一次重选仍从最近目标开始。
    let budget = 12000;
    for (const target of candidates) {
      if (budget <= 0) break;
      const end = this.anchor(target);
      if (!end) continue;
      const heuristic = (x: number, z: number) => Math.abs(end.x - x) + Math.abs(end.z - z);
      const frontier = new Frontier();
      const best = new Map<string, number>();
      const startKey = `${start.x},${start.z}`;
      frontier.push({ ...start, key: startKey, cost: 0, estimate: heuristic(start.x, start.z), parent: null });
      best.set(startKey, 0);
      let remaining = Math.min(3000, budget);
      while (remaining-- > 0) {
        const node = frontier.pop();
        if (!node) break;
        budget--;
        if (node.cost !== best.get(node.key)) continue;
        if (node.x === end.x && node.z === end.z) {
          const path: Point[] = [target];
          let cursor: Node | null = node;
          while (cursor) {
            path.push({ x: cursor.x, z: cursor.z });
            cursor = cursor.parent;
          }
          path.push(origin);
          return path.reverse();
        }
        for (const [dx, dz] of DIRECTIONS) {
          const next = { x: node.x + dx * STEP, z: node.z + dz * STEP };
          const key = `${next.x},${next.z}`;
          const cost = node.cost + STEP;
          if (cost >= (best.get(key) ?? Infinity) || !this.segmentDry(node, next)) continue;
          best.set(key, cost);
          frontier.push({ ...next, key, cost, estimate: cost + heuristic(next.x, next.z), parent: node });
        }
      }
    }
    return null;
  }
}
