export const DEATH_RETREAT_DISTANCE = 30;

type Point = { x: number; z: number };
export type WildlifeRetreat = {
  origin: Point;
  path: Point[];
  arrived: boolean;
  retryLeft: number;
  /** 单机嘲讽清场可使用更短距离，并在抵达后恢复正常行为。 */
  distance?: number;
  mercy?: boolean;
  fixedDestination?: boolean;
  destination?: Point;
};

/** 有界网格搜索，仅在击杀或道路失效时运行；逐段检查，避免穿过障碍。 */
export function findRetreatPath(start: Point, origin: Point, canStand: (x: number, z: number) => boolean, distance = DEATH_RETREAT_DISTANCE, partial = false, destination?: Point): Point[] {
  const nodes = [{ x: start.x, z: start.z, parent: -1 }];
  const visited = new Set<string>(['0,0']);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let farthest = 0;
  const pathTo = (index: number): Point[] => {
    const path: Point[] = [];
    for (let i = index; nodes[i].parent >= 0; i = nodes[i].parent) path.push(nodes[i]);
    return path.reverse();
  };
  for (let head = 0; head < nodes.length && head < 12000; head++) {
    const node = nodes[head];
    const separation = Math.hypot(node.x - origin.x, node.z - origin.z);
    if (separation > Math.hypot(nodes[farthest].x - origin.x, nodes[farthest].z - origin.z)) farthest = head;
    if (destination) {
      if (Math.hypot(node.x - destination.x, node.z - destination.z) <= 1 &&
        [0.25, 0.5, 0.75, 1].every(t => canStand(node.x + (destination.x - node.x) * t, node.z + (destination.z - node.z) * t))) {
        return [...pathTo(head), { ...destination }];
      }
    } else if (separation >= distance + 1) return head === 0 ? [{ x: node.x, z: node.z }] : pathTo(head);
    for (const [dx, dz] of directions) {
      const x = node.x + dx;
      const z = node.z + dz;
      const key = `${Math.round(x - start.x)},${Math.round(z - start.z)}`;
      if (visited.has(key)) continue;
      if (![0.25, 0.5, 0.75, 1].every(t => canStand(node.x + dx * t, node.z + dz * t))) continue;
      visited.add(key);
      nodes.push({ x, z, parent: head });
    }
  }
  return partial ? pathTo(farthest) : [];
}
