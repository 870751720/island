import * as THREE from 'three';
import { patchSeasonMaterial } from './SeasonVisuals';

export type GroundNeighbors = (dx: number, dz: number) => boolean;

/** 连通处不收边；外沿按世界坐标柔和起伏，地表颜色逐渐透出。 */
export function groundCoverage(x: number, z: number, cx: number, cz: number, neighbor: GroundNeighbors, edgeWidth = 0.20): number {
  const px = x - cx, pz = z - cz;
  let distance = 1;
  if (!neighbor(-1, 0)) distance = Math.min(distance, px + 0.5);
  if (!neighbor(1, 0)) distance = Math.min(distance, 0.5 - px);
  if (!neighbor(0, -1)) distance = Math.min(distance, pz + 0.5);
  if (!neighbor(0, 1)) distance = Math.min(distance, 0.5 - pz);
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    if (!neighbor(dx, dz)) distance = Math.min(distance, Math.hypot(px - dx * 0.5, pz - dz * 0.5));
  }
  const scale = edgeWidth / 0.20;
  const waviness = (Math.sin(x * 19 + Math.sin(z * 13)) * 0.025 + Math.sin(z * 27 + x * 11) * 0.02) * scale;
  return THREE.MathUtils.smoothstep(distance, Math.max(0.02 * scale, 0.035 * scale + waviness), edgeWidth + waviness);
}

export function groundSurfaceMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  patchSeasonMaterial(material, 'terrain');
  return material;
}
