export const DEATH_RETREAT_DISTANCE = 30;

type Point = { x: number; z: number };
export type WildlifeRetreat = {
  origin: Point;
  path: Point[];
  arrived: boolean;
  retryLeft: number;
};

/** 有界网格搜索，仅在击杀或道路失效时运行；逐段检查，避免穿过障碍。 */
export function findRetreatPath(start: Point, origin: Point, canStand: (x: number, z: number) => boolean): Point[] {
  const nodes = [{ x: start.x, z: start.z, parent: -1 }];
  const visited = new Set<string>(['0,0']);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let head = 0; head < nodes.length && head < 12000; head++) {
    const node = nodes[head];
    if (Math.hypot(node.x - origin.x, node.z - origin.z) >= DEATH_RETREAT_DISTANCE + 1) {
      const path: Point[] = [];
      for (let i = head; nodes[i].parent >= 0; i = nodes[i].parent) path.push(nodes[i]);
      return path.reverse();
    }
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
  return [];
}
