import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Lobe = readonly [x: number, y: number, z: number, sx: number, sy: number, sz: number];

/** 宽阔主体贯穿整朵云，其余大块深入主体，仅在边缘形成起伏。 */
const CLOUD_SHAPES: readonly (readonly Lobe[])[] = [
  // 宽厚云：连续底座托住偏心云冠。
  [[0, 0, 0, 8.5, 1.8, 4.6], [-2.2, 1, 0, 5.2, 2.6, 4],
    [2.5, 0.6, 0.2, 4.8, 2.1, 3.9], [0, 0.1, 1.5, 5.7, 1.7, 3.5]],
  // 长云：整个底座连续，两端收窄，不拖出碎云尾。
  [[0, 0, 0, 11, 1.25, 3.6], [-3.5, 0.5, 0, 5.8, 1.8, 3.2],
    [3.7, 0.25, 0, 5.5, 1.45, 3], [0.3, 0.3, 0.8, 6, 1.4, 3.1]],
  // 高冠云：单侧隆起，宽底保持完整的视觉体量。
  [[0, 0, 0, 7.8, 1.7, 4.8], [-1.8, 1.7, -0.2, 4.8, 3.6, 4],
    [2.5, 0.6, 0, 4.6, 2.1, 3.9], [-0.5, 0.3, 1.4, 5.3, 1.9, 3.6]],
];

export function createCloudGeometry(seed: number): THREE.BufferGeometry {
  const random = (index: number) => {
    const value = Math.sin((seed + 1) * 91.7 + index * 391.3) * 43758.5453;
    return value - Math.floor(value);
  };
  const parts = CLOUD_SHAPES[seed % CLOUD_SHAPES.length].map(([x, y, z, sx, sy, sz], index) => {
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    // 小幅转动切面，限制扰动以保持云块充分交叠。
    geometry.rotateY((random(index * 3) - 0.5) * 0.3);
    const variation = 0.96 + random(index * 3 + 1) * 0.08;
    geometry.scale(sx * variation, sy * (0.96 + random(index * 3 + 2) * 0.08), sz * variation);
    geometry.translate(x, y, z);
    return geometry;
  });
  const geometry = mergeGeometries(parts)!;
  parts.forEach(part => part.dispose());
  geometry.computeBoundingSphere();
  return geometry;
}
