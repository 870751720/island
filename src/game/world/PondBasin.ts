/** 按最终水位塑造洼底,让岸线不随原地势与水位的高差向内收缩。 */
export function getPondBasinHeight(
  ground: number,
  distance: number,
  waterY: number,
  depth: number,
  minFloor: number,
): number {
  if (distance >= 1) return ground;
  const shoreline = 0.88;
  let basin: number;
  if (distance <= shoreline) {
    basin = waterY - depth * (1 - (distance / shoreline) ** 2);
  } else {
    const t = (distance - shoreline) / (1 - shoreline);
    basin = waterY + (ground - waterY) * t * t * (3 - 2 * t);
  }
  // 只下挖,不抬高低地;洼底留在海面上方,避免全局海面穿入。
  return Math.min(ground, Math.max(minFloor, basin));
}
