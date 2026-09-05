/** 放置朝向约定:摆件(工作台/床/木箱等)只允许上下左右四个朝向 */

/** 把任意朝向角量化到最接近的 0 / 90 / 180 / 270 度 */
export function cardinalRotY(rotY: number): number {
  return Math.round(rotY / (Math.PI / 2)) * (Math.PI / 2);
}
