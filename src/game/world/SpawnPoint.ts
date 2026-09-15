type Point = { x: number; z: number };

/** 在一米干地网格中寻找最大四向连通区域，再选其南端落点。 */
export function findMainlandSpawn(
  halfWidth: number,
  halfLength: number,
  isDry: (x: number, z: number) => boolean,
  canSpawn: (x: number, z: number) => boolean,
): Point {
  const columns = Math.floor(halfWidth * 2) + 1;
  const rows = Math.floor(halfLength * 2) + 1;
  const land = new Uint8Array(columns * rows);
  const queue = new Int32Array(land.length);
  const point = (index: number): Point => ({
    x: index % columns - halfWidth,
    z: Math.floor(index / columns) - halfLength,
  });
  for (let index = 0; index < land.length; index++) {
    const { x, z } = point(index);
    land[index] = isDry(x, z) ? 1 : 0;
  }

  let largestSize = 0;
  let selected: Point | null = null;
  for (let start = 0; start < land.length; start++) {
    if (land[start] !== 1) continue;
    let head = 0, tail = 1;
    queue[0] = start;
    land[start] = 2;
    let southern: Point | null = null;
    while (head < tail) {
      const index = queue[head++];
      const current = point(index);
      const preferred = southern === null || current.z > southern.z ||
        (current.z === southern.z && Math.abs(current.x) < Math.abs(southern.x));
      if (preferred && canSpawn(current.x, current.z)) southern = current;

      const visit = (neighbor: number) => {
        if (land[neighbor] !== 1) return;
        const next = point(neighbor);
        // 防止相邻干地点跨过窄水沟相连；四向搜索也不允许对角跨水。
        if (!isDry((current.x + next.x) / 2, (current.z + next.z) / 2)) return;
        land[neighbor] = 2;
        queue[tail++] = neighbor;
      };
      const column = index % columns;
      if (column > 0) visit(index - 1);
      if (column + 1 < columns) visit(index + 1);
      if (index >= columns) visit(index - columns);
      if (index + columns < land.length) visit(index + columns);
    }
    if (tail > largestSize) {
      largestSize = tail;
      selected = southern;
    }
  }
  // 不把不安全的原点或次要小岛当作兜底出生点。
  if (!selected) throw new Error('主岛没有可用的安全出生点');
  return selected;
}
