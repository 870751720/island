import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** 紧密重叠的云底与大小云冠，共用平缓底线，避免串珠状轮廓。 */
export function createCloudGeometry(seed: number): THREE.BufferGeometry {
  const random = (index: number) => {
    const value = Math.sin((seed + 1) * 91.7 + index * 391.3) * 43758.5453;
    return value - Math.floor(value);
  };
  // x、y、z、横向半径、纵向半径、深度半径。
  const lobes = [
    [0, 0, 0, 5.3, 1.05, 2.7],
    [-3.5, 0.35, 0.1, 2.7, 1.5, 2.25],
    [3.3, 0.3, 0.2, 2.6, 1.4, 2.1],
    [-1.4, 1.15, -0.3, 2.8, 2.55, 2.4],
    [1.6, 0.9, -0.4, 2.6, 2.1, 2.2],
    [-0.5, 0.4, 1.5, 2.5, 1.5, 1.8],
    [2.5, 0.25, 1.15, 1.9, 1.25, 1.65],
  ];
  const bottom = new THREE.Color('#d6e1e8');
  const top = new THREE.Color('#fffdf6');
  const color = new THREE.Color();
  const parts = lobes.map(([x, y, z, sx, sy, sz], index) => {
    const geometry = new THREE.IcosahedronGeometry(1, 2);
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const variation = 0.88 + random(index * 3) * 0.24;
    for (let i = 0; i < positions.count; i++) {
      const py = positions.getY(i);
      // 下半球压薄但不硬截断，保持云底圆润且无退化面。
      const height = y + py * sy * variation * (py < 0 ? 0.48 : 1);
      positions.setXYZ(i, x + positions.getX(i) * sx * variation,
        height, z + positions.getZ(i) * sz * variation);
      color.copy(bottom).lerp(top, THREE.MathUtils.smoothstep(height, -0.65, 2.3));
      color.toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  });
  const geometry = mergeGeometries(parts)!;
  parts.forEach(part => part.dispose());
  geometry.computeBoundingSphere();
  return geometry;
}
