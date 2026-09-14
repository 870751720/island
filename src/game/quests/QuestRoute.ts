import type { IslandTerrain } from '../world/IslandTerrain';

type Point = { x: number; z: number };
type Node = Point & { key: string; cost: number; estimate: number; parent: Node | null };
const STEP = 2;
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

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

/** 比较可达路线长度，用按需缓存的陆地网格寻路并拉直多余折角。 */
export class QuestRoute {
  private dry = new Map<string, boolean>();
  private cacheAge = 0;
  constructor(private terrain: IslandTerrain, private passable = (x: number, z: number) => terrain.getWaterKind(x, z) === null) { }

  private isDry(x: number, z: number): boolean {
    const key = `${x},${z}`;
    const cached = this.dry.get(key);
    if (cached !== undefined) return cached;
    const ok = Math.abs(x) < this.terrain.halfWidth && Math.abs(z) < this.terrain.halfLength
      && this.passable(x, z);
    if (this.dry.size >= 50000) this.dry.clear();
    this.dry.set(key, ok);
    return ok;
  }

  private segmentDry(a: Point, b: Point): boolean {
    const samples = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5));
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      if (!this.isDry(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }

  /** 拉直可通行的折线，再按距离采样贴地，避免长线穿入起伏地形。 */
  private simplify(path: Point[]): { points: Point[]; length: number } {
    const corners = [path[0]];
    let index = 0;
    while (index < path.length - 1) {
      let next = path.length - 1;
      while (next > index + 1 && !this.segmentDry(path[index], path[next])) next--;
      corners.push(path[next]);
      index = next;
    }
    return this.sample(corners);
  }

  private sample(corners: Point[]): { points: Point[]; length: number } {
    const points = [corners[0]];
    let length = 0;
    for (let i = 1; i < corners.length; i++) {
      const a = corners[i - 1], b = corners[i];
      const distance = Math.hypot(b.x - a.x, b.z - a.z);
      length += distance;
      const count = Math.ceil(distance / 0.5);
      for (let j = 1; j <= count; j++) {
        const t = j / count;
        points.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      }
    }
    return { points, length };
  }

  /** 仅做有距离上限的直达检测，不启动完整寻路。 */
  direct(origin: Point, target: Point): Point[] | null {
    if (Math.hypot(target.x - origin.x, target.z - origin.z) > 60
      || !this.segmentDry(origin, target)) return null;
    return this.sample([{ x: origin.x, z: origin.z }, target]).points;
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
    const distance = (p: Point) => (p.x - origin.x) ** 2 + (p.z - origin.z) ** 2;
    const candidates = targets.filter(p => this.isDry(p.x, p.z)).sort((a, b) => distance(a) - distance(b));
    // 每次搜索预算有上限，避免孤立物资导致手机长帧；下一次重选仍从最近目标开始。
    let budget = 12000;
    let shortest: { points: Point[]; length: number } | null = null;
    const start = this.anchor(origin);
    for (const target of candidates) {
      if (shortest && distance(target) >= shortest.length ** 2) break;
      if (this.segmentDry(origin, target)) {
        shortest = this.simplify([origin, target]);
        break;
      }
      if (budget <= 0) break;
      if (!start) continue;
      const end = this.anchor(target);
      if (!end) continue;
      const heuristic = (x: number, z: number) => Math.hypot(end.x - x, end.z - z);
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
          const route = this.simplify(path.reverse());
          if (!shortest || route.length < shortest.length) shortest = route;
          break;
        }
        for (const [dx, dz] of DIRECTIONS) {
          const next = { x: node.x + dx * STEP, z: node.z + dz * STEP };
          const key = `${next.x},${next.z}`;
          const cost = node.cost + Math.hypot(dx, dz) * STEP;
          if (cost >= (best.get(key) ?? Infinity) || !this.segmentDry(node, next)) continue;
          best.set(key, cost);
          frontier.push({ ...next, key, cost, estimate: cost + heuristic(next.x, next.z), parent: node });
        }
      }
    }
    return shortest?.points ?? null;
  }
}
