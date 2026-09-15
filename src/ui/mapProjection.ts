/** 沿中心到目标的射线，将标记限制在扣除自身半径的圆角地图内。 */
export function projectMapMarker(dx: number, dy: number, halfSize: number, cornerRadius: number, inset: number) {
  const edge = halfSize - inset;
  const reach = Math.max(Math.abs(dx), Math.abs(dy));
  if (reach === 0) return { x: 0, y: 0, outside: false };

  const ux = Math.abs(dx) / reach;
  const uy = Math.abs(dy) / reach;
  const radius = Math.max(0, cornerRadius - inset);
  const corner = edge - radius;
  let limit = edge;
  // 射线落在圆角段时，取射线与内缩圆角圆弧的交点。
  if (radius > 0 && ux * edge > corner && uy * edge > corner) {
    const a = ux * ux + uy * uy;
    const b = corner * (ux + uy);
    limit = (b + Math.sqrt(Math.max(0, b * b - a * (2 * corner * corner - radius * radius)))) / a;
  }
  const factor = Math.min(1, limit / reach);
  return { x: dx * factor, y: dy * factor, outside: reach > limit };
}
