import * as THREE from 'three';
import type { IslandTerrain } from './IslandTerrain';

export type GroundTriangle = [THREE.Vector3, THREE.Vector3, THREE.Vector3];

/** 按竖直边界裁剪，交点高度沿原地形三角面插值。 */
function clip(points: THREE.Vector3[], axis: 'x' | 'z', edge: number, sign: number): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const insideA = (a[axis] - edge) * sign >= 0;
    const insideB = (b[axis] - edge) * sign >= 0;
    if (insideA) result.push(a);
    if (insideA !== insideB) result.push(a.clone().lerp(b, (edge - a[axis]) / (b[axis] - a[axis])));
  }
  return result;
}

/** 裁出一格路底，保留原地形坡折和顶点色；边缘细分仅用于自然混色。 */
export function groundPatchGeometry(
  terrain: IslandTerrain, origin: THREE.Vector3, coverage: (x: number, z: number) => number, minimumCoverage = 0
): THREE.BufferGeometry {
  const geometry = terrain.mesh.geometry as THREE.PlaneGeometry;
  const { widthSegments: cols, heightSegments: rows, width, height } = geometry.parameters;
  const positions = geometry.getAttribute('position'), colors = geometry.getAttribute('color');
  const index = geometry.getIndex()!;
  const minX = origin.x - 0.5, maxX = origin.x + 0.5;
  const minZ = origin.z - 0.5, maxZ = origin.z + 0.5;
  const firstX = Math.max(0, Math.floor((minX + width / 2) / width * cols));
  const lastX = Math.min(cols - 1, Math.floor((maxX + width / 2) / width * cols));
  const firstZ = Math.max(0, Math.floor((minZ + height / 2) / height * rows));
  const lastZ = Math.min(rows - 1, Math.floor((maxZ + height / 2) / height * rows));
  const vertices: number[] = [], tints: number[] = [];
  const gravel = new THREE.Color('#918775');
  const bary = new THREE.Vector3();
  const tint = new THREE.Color();
  for (let z = firstZ; z <= lastZ; z++) for (let x = firstX; x <= lastX; x++) {
    for (let t = 0; t < 2; t++) {
      const offset = (z * cols + x) * 6 + t * 3;
      const ids = [0, 1, 2].map((i) => index.getX(offset + i));
      const source = ids.map((i) => new THREE.Vector3().fromBufferAttribute(positions, i));
      const triangle = new THREE.Triangle(source[0], source[1], source[2]);
      // 保留精确裁剪边界，8×8 混色网格不会跨过地形折线架空。
      for (let iz = 0; iz < 8; iz++) for (let ix = 0; ix < 8; ix++) {
        const left = minX + ix / 8, top = minZ + iz / 8;
        const polygon = clip(clip(clip(clip(source, 'x', left, 1), 'x', left + 1 / 8, -1), 'z', top, 1), 'z', top + 1 / 8, -1);
        for (let i = 1; i + 1 < polygon.length; i++) {
          const face: GroundTriangle = [polygon[0], polygon[i], polygon[i + 1]];
          if (new THREE.Triangle(...face).getArea() < 1e-9) continue;
          if (minimumCoverage > 0 && coverage((face[0].x + face[1].x + face[2].x) / 3,
            (face[0].z + face[1].z + face[2].z) / 3) < minimumCoverage) continue;
          for (const p of face) {
            triangle.getBarycoord(p, bary);
            tint.setRGB(
              colors.getX(ids[0]) * bary.x + colors.getX(ids[1]) * bary.y + colors.getX(ids[2]) * bary.z,
              colors.getY(ids[0]) * bary.x + colors.getY(ids[1]) * bary.y + colors.getY(ids[2]) * bary.z,
              colors.getZ(ids[0]) * bary.x + colors.getZ(ids[1]) * bary.y + colors.getZ(ids[2]) * bary.z
            ).lerp(gravel, coverage(p.x, p.z));
            vertices.push(p.x - origin.x, p.y - origin.y + 0.012, p.z - origin.z);
            tints.push(tint.r, tint.g, tint.b);
          }
        }
      }
    }
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
  result.computeVertexNormals();
  return result;
}
