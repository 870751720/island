import * as THREE from 'three';

export function clearFoodPath(from: THREE.Vector3, to: THREE.Vector3, allowed: (x: number, z: number) => boolean): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.15));
  for (let i = 1; i <= steps; i++) if (!allowed(from.x + (to.x - from.x) * i / steps, from.z + (to.z - from.z) * i / steps)) return false;
  return true;
}

type Node = { x: number; z: number; cost: number; score: number; parent: Node | null };

/** 有界最小堆，远距离目标仍保持每次寻路最多 900 个节点的手机预算。 */
class Frontier {
  private nodes: Node[] = [];
  push(node: Node): void {
    let i = this.nodes.length;
    this.nodes.push(node);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.nodes[parent].score <= node.score) break;
      this.nodes[i] = this.nodes[parent]; i = parent;
    }
    this.nodes[i] = node;
  }
  pop(): Node | undefined {
    const first = this.nodes[0], last = this.nodes.pop();
    if (!last || !this.nodes.length) return first;
    let i = 0;
    while (i * 2 + 1 < this.nodes.length) {
      let child = i * 2 + 1;
      if (child + 1 < this.nodes.length && this.nodes[child + 1].score < this.nodes[child].score) child++;
      if (this.nodes[child].score >= last.score) break;
      this.nodes[i] = this.nodes[child]; i = child;
    }
    this.nodes[i] = last;
    return first;
  }
}

/** A* 仅在换目标时运行，路径每一段均校验地形与围栏。 */
export function foodPath(origin: THREE.Vector3, goal: THREE.Vector3, allowed: (x: number, z: number) => boolean, range: number): THREE.Vector3[] | null {
  if (clearFoodPath(origin, goal, allowed)) return [goal];
  const step = 0.75;
  const frontier = new Frontier();
  const costs = new Map<string, number>([['0,0', 0]]);
  frontier.push({ x: 0, z: 0, cost: 0, score: origin.distanceTo(goal), parent: null });
  for (let expanded = 0; expanded < 900; expanded++) {
    const node = frontier.pop();
    if (!node) break;
    if (node.cost !== costs.get(`${node.x},${node.z}`)) continue;
    const at = new THREE.Vector3(origin.x + node.x * step, origin.y, origin.z + node.z * step);
    if (clearFoodPath(at, goal, allowed)) {
      const path = [goal];
      for (let n: Node | null = node; n?.parent; n = n.parent) {
        path.unshift(new THREE.Vector3(origin.x + n.x * step, origin.y, origin.z + n.z * step));
      }
      return path;
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = node.x + dx, z = node.z + dz, key = `${x},${z}`, cost = node.cost + step;
      if (Math.hypot(x, z) * step > range || cost >= (costs.get(key) ?? Infinity)) continue;
      const next = new THREE.Vector3(origin.x + x * step, origin.y, origin.z + z * step);
      if (!clearFoodPath(at, next, allowed)) continue;
      costs.set(key, cost);
      frontier.push({ x, z, cost, score: cost + Math.hypot(next.x - goal.x, next.z - goal.z), parent: node });
    }
  }
  return null;
}
