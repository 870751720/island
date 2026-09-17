type Point = { x: number; z: number };

/** 先覆盖整岛，再细化最近候选；只在死亡结算时运行，不占用逐帧预算。 */
export function findNearestDryPoint(
  origin: Point,
  halfWidth: number,
  halfLength: number,
  isDry: (x: number, z: number) => boolean,
  fallback: () => Point,
): Point {
  if (isDry(origin.x, origin.z)) return { x: origin.x, z: origin.z };
  let best: Point | undefined;
  let distance = Infinity;
  const consider = (x: number, z: number) => {
    if (Math.abs(x) > halfWidth || Math.abs(z) > halfLength) return;
    const d = (x - origin.x) ** 2 + (z - origin.z) ** 2;
    if (d >= distance || !isDry(x, z)) return;
    best = { x, z };
    distance = d;
  };
  for (let x = -halfWidth; x <= halfWidth; x += 1) {
    for (let z = -halfLength; z <= halfLength; z += 1) consider(x, z);
  }
  if (!best) return fallback();
  for (const step of [0.25, 0.0625]) {
    const center: Point = best;
    for (let ix = -4; ix <= 4; ix++) {
      for (let iz = -4; iz <= 4; iz++) consider(center.x + ix * step, center.z + iz * step);
    }
  }
  return best;
}
