type Point = { x: number; z: number };
export const TRANSPLANT_CAMP_RANGE = 6;

/** 引导与权威结算共用水平距离；营火无需处于燃烧状态。 */
export function nearTransplantCamp(point: Point, fires: readonly Point[]): boolean {
  return fires.some(fire => Math.hypot(point.x - fire.x, point.z - fire.z) <= TRANSPLANT_CAMP_RANGE);
}

/** 只扫描最近八座营火周围的整数格，复用实际安放校验。 */
export function transplantCells(origin: Point, fires: readonly Point[], valid: (x: number, z: number) => boolean): Point[] {
  const cells = new Map<string, Point>();
  const nearest = [...fires].sort((a, b) => Math.hypot(a.x - origin.x, a.z - origin.z) - Math.hypot(b.x - origin.x, b.z - origin.z)).slice(0, 8);
  for (const fire of nearest) {
    for (let x = Math.ceil(fire.x - TRANSPLANT_CAMP_RANGE); x <= fire.x + TRANSPLANT_CAMP_RANGE; x++) {
      for (let z = Math.ceil(fire.z - TRANSPLANT_CAMP_RANGE); z <= fire.z + TRANSPLANT_CAMP_RANGE; z++) {
        if (nearTransplantCamp({ x, z }, [fire]) && valid(x, z)) cells.set(`${x},${z}`, { x, z });
      }
    }
  }
  return [...cells.values()];
}
