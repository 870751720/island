import * as THREE from 'three';

/**
 * 在 XZ 平面上求与线段(上一帧位置→当前位置)距离不超过 range 的最近活动物。
 * 箭矢贴着胸口高度平飞,命中判定忽略高度差,飞鸟与地面动物都按平面距离结算。
 */
export function nearestToSegmentXZ<T extends { pos: THREE.Vector3; alive: boolean }>(
  items: readonly T[],
  from: THREE.Vector3,
  to: THREE.Vector3,
  range: number
): T | null {
  const fx = from.x;
  const fz = from.z;
  const dx = to.x - fx;
  const dz = to.z - fz;
  const lenSq = dx * dx + dz * dz;
  let best: T | null = null;
  let bestDist = range * range;
  for (const item of items) {
    if (!item.alive) continue;
    let t = lenSq > 0 ? ((item.pos.x - fx) * dx + (item.pos.z - fz) * dz) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = fx + dx * t;
    const cz = fz + dz * t;
    const d = (item.pos.x - cx) ** 2 + (item.pos.z - cz) ** 2;
    if (d < bestDist) {
      best = item;
      bestDist = d;
    }
  }
  return best;
}
