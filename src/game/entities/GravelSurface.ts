import * as THREE from 'three';
export { groundCoverage as gravelCoverage, groundSurfaceMaterial as gravelSurfaceMaterial } from '../world/GroundSurface';

/** 路面内部也留出不规则的露土斑块，使用世界坐标保证跨格连续。 */
export function gravelGroundCoverage(x: number, z: number): number {
  const patch = 0.5 + Math.sin(x * 6.7 + Math.sin(z * 4.3)) * 0.28
    + Math.sin(z * 8.1 + Math.sin(x * 3.9)) * 0.22;
  return 0.7 * THREE.MathUtils.smoothstep(patch, 0.28, 0.72);
}
