import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createCloudGeometry } from './CloudModel';

type Member = readonly [shape: number, x: number, y: number, z: number, scale: number, yaw: number];

/** 主云相接形成主体，边缘碎云留出空隙；每组有统一的漂移速度。 */
const CLUSTERS: readonly (readonly Member[])[] = [
  // 宽云群：高冠和薄片叠搭，前后散落小云。
  [[1, -3, 0, 0, 1.3, 0], [3, 3.5, 0.3, -1.5, 1.05, 0.2],
    [2, 1, -0.6, 3.5, 0.85, -0.3], [5, -9, -0.4, 4.5, 0.8, 0.3],
    [5, 10, 0.2, 2, 0.7, -0.5]],
  // 拖尾云带：大云头向小云尾逐渐收细，保留断续空隙。
  [[1, 4, 0.4, 0, 1.25, 0], [0, -3, 0, 0.8, 0.9, 0.1],
    [4, -10, -0.3, 1.8, 0.7, -0.2], [5, -15.5, -0.5, 2.5, 0.65, 0.1]],
  // 错层云簇：两片主体斜向相接，碎云围绕外沿。
  [[2, -3, 0, -2, 1.15, -0.35], [4, 3, 0.8, 2, 1.1, 0.45],
    [1, 0, 1.1, -0.5, 0.7, 0.2], [5, 8.5, 0, -3.5, 0.8, 0.5],
    [5, -8.5, -0.4, 3.5, 0.65, -0.4]],
];

export function createCloudClusterGeometry(seed: number): THREE.BufferGeometry {
  const parts = CLUSTERS[seed % CLUSTERS.length].map(([shape, x, y, z, scale, yaw], index) => {
    // 六种云形的序号保持稳定，同类组合仍有不同的局部切面。
    const geometry = createCloudGeometry(shape + (seed * 5 + index) * 6);
    geometry.scale(scale, scale, scale);
    geometry.rotateY(yaw);
    geometry.translate(x, y, z);
    return geometry;
  });
  const geometry = mergeGeometries(parts)!;
  parts.forEach(part => part.dispose());
  geometry.computeBoundingSphere();
  return geometry;
}
