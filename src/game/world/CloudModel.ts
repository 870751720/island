import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Lobe = readonly [x: number, y: number, z: number, sx: number, sy: number, sz: number];

/** 每种云形有独立的空间布局，尺寸扰动仅用于同类云的变化。 */
const CLOUD_SHAPES: readonly (readonly Lobe[])[] = [
  // 狭长风带：两端收窄，沿风向略微弯折。
  [[-5, 0, -0.5, 2.5, 0.65, 1.2], [-2, 0.15, 0, 3, 0.95, 1.7],
    [1.3, 0, 0.4, 3.2, 0.8, 1.6], [4.7, -0.1, 0.7, 2.3, 0.55, 1]],
  // 紧凑团簇：向不同方向伸展，主团偏心。
  [[-1, 0.3, 0, 3.2, 1.8, 2.8], [2, 0, 0.8, 2.5, 1.2, 2],
    [-2.5, -0.2, 1.5, 2.1, 1, 1.8], [0.5, 0.15, -2, 2.2, 1.4, 1.9]],
  // 薄云片：宽而扁，边缘错落。
  [[-1.7, 0, 0, 3.8, 0.65, 2.8], [2.2, 0.1, -0.6, 3.1, 0.75, 2.5],
    [0.5, -0.15, 2, 2.8, 0.5, 2], [-3.2, -0.1, -1.7, 2, 0.45, 1.5]],
  // 高冠云：一侧高耸，另一侧逐渐降低。
  [[-2, 0, 0, 2.6, 1.15, 2.1], [-1.5, 1.5, -0.3, 2.2, 2.5, 1.9],
    [1.1, 0.5, 0, 2.6, 1.65, 2], [3.8, -0.15, 0.5, 2, 0.8, 1.5]],
  // 弯月云：中间留出凹口，轮廓不填成椭圆。
  [[-3.5, 0, 1.5, 2, 0.8, 1.7], [-2.2, 0.2, -0.8, 2.4, 1.15, 1.8],
    [0.6, 0.15, -1.7, 2.4, 1, 1.5], [3.2, -0.1, -0.7, 2, 0.7, 1.4]],
  // 小碎云：较小的独立云团，打破天空尺寸的一致性。
  [[-0.7, 0, 0, 1.8, 0.85, 1.5], [1.1, 0.2, 0.3, 1.5, 1.1, 1.2],
    [2.4, -0.2, 0.5, 1.1, 0.5, 0.85]],
];

export function createCloudGeometry(seed: number): THREE.BufferGeometry {
  const random = (index: number) => {
    const value = Math.sin((seed + 1) * 91.7 + index * 391.3) * 43758.5453;
    return value - Math.floor(value);
  };
  const parts = CLOUD_SHAPES[seed % CLOUD_SHAPES.length].map(([x, y, z, sx, sy, sz], index) => {
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    geometry.rotateY(random(index * 4) * Math.PI);
    geometry.rotateX((random(index * 4 + 1) - 0.5) * 0.4);
    const variation = 0.9 + random(index * 4 + 2) * 0.2;
    geometry.scale(sx * variation, sy * (0.9 + random(index * 4 + 3) * 0.2), sz * variation);
    geometry.translate(x, y, z);
    return geometry;
  });
  const geometry = mergeGeometries(parts)!;
  parts.forEach(part => part.dispose());
  geometry.computeBoundingSphere();
  return geometry;
}
