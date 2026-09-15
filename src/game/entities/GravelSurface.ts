import * as THREE from 'three';
import { patchSeasonMaterial } from '../world/SeasonVisuals';

import type { RoadNeighbors } from './RoadModel';

/** 连通处不收边；外沿按世界坐标柔和起伏，地表颜色逐渐透出。 */
export function gravelCoverage(x: number, z: number, cx: number, cz: number, neighbor: RoadNeighbors): number {
  const px = x - cx, pz = z - cz;
  let distance = 1;
  if (!neighbor(-1, 0)) distance = Math.min(distance, px + 0.5);
  if (!neighbor(1, 0)) distance = Math.min(distance, 0.5 - px);
  if (!neighbor(0, -1)) distance = Math.min(distance, pz + 0.5);
  if (!neighbor(0, 1)) distance = Math.min(distance, 0.5 - pz);
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    if (!neighbor(dx, dz)) distance = Math.min(distance, Math.hypot(px - dx * 0.5, pz - dz * 0.5));
  }
  const waviness = Math.sin(x * 19 + Math.sin(z * 13)) * 0.025 + Math.sin(z * 27 + x * 11) * 0.02;
  return THREE.MathUtils.smoothstep(distance, Math.max(0.02, 0.035 + waviness), 0.20 + waviness);
}

/** 路面内部也留出不规则的露土斑块，使用世界坐标保证跨格连续。 */
export function gravelGroundCoverage(x: number, z: number): number {
  const patch = 0.5 + Math.sin(x * 6.7 + Math.sin(z * 4.3)) * 0.28
    + Math.sin(z * 8.1 + Math.sin(x * 3.9)) * 0.22;
  return 0.7 * THREE.MathUtils.smoothstep(patch, 0.28, 0.72);
}

export function gravelSurfaceMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  patchSeasonMaterial(material, 'terrain');
  return material;
}
