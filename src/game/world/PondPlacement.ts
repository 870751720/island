/** 岸边必须留出一个地形三角形的余量,防止粗网格插值把低处接进水洼。 */
const BANK_GRID_MARGIN = 2.6;
const BANK_HEIGHT_MARGIN = 0.3;

/** 初始化时保守检查外接圆及岸边余量,同时覆盖内部低地,避免形成通海缺口。 */
export function getEnclosedPondWaterLevel(
  x: number,
  z: number,
  radius: number,
  waterY: number,
  minWaterY: number,
  heightAt: (x: number, z: number) => number,
): number | null {
  const extent = radius + BANK_GRID_MARGIN;
  const steps = Math.ceil(extent * 2);
  for (let iz = 0; iz <= steps; iz++) {
    const dz = -extent + iz * extent * 2 / steps;
    for (let ix = 0; ix <= steps; ix++) {
      const dx = -extent + ix * extent * 2 / steps;
      waterY = Math.min(waterY, heightAt(x + dx, z + dz) - BANK_HEIGHT_MARGIN);
      if (waterY < minWaterY) return null;
    }
  }
  return waterY;
}
