import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Point = [number, number, number];

/** 三档帐篷共享睡眠轴线和卧铺高度；同材质合批，控制手机端 drawcall。 */
export function makeTentMesh(level: number, miniature = false): THREE.Group {
  const luxury = level >= 3;
  const upgraded = level >= 2;
  const material = (color: string) => new THREE.MeshStandardMaterial({
    color, flatShading: true, roughness: 1, side: THREE.DoubleSide,
  });
  const canvas = material(luxury ? '#eee0be' : upgraded ? '#b76543' : '#788650');
  const trim = material(luxury ? '#c79946' : upgraded ? '#e1bc83' : '#b3ab75');
  const wood = material(luxury ? '#594334' : '#785335');
  const bedding = material(luxury ? '#f6edda' : upgraded ? '#b38b65' : '#c0a365');
  const accent = material(luxury ? '#397c78' : upgraded ? '#694733' : '#58673e');
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const add = (geometry: THREE.BufferGeometry, mat: THREE.Material) => {
    const plain = geometry.index ? geometry.toNonIndexed() : geometry;
    if (plain !== geometry) geometry.dispose();
    plain.deleteAttribute('uv');
    const batch = batches.get(mat) ?? [];
    batch.push(plain);
    batches.set(mat, batch);
  };
  const box = (size: Point, position: Point, mat: THREE.Material) => {
    add(new THREE.BoxGeometry(...size).translate(...position), mat);
  };
  const panel = (points: Point[], mat: THREE.Material) => {
    const vertices: number[] = [];
    for (let i = 1; i < points.length - 1; i++) vertices.push(...points[0], ...points[i], ...points[i + 1]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    add(geometry, mat);
  };
  const beam = (from: Point, to: Point, radius: number, mat: THREE.Material) => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 5);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    geometry.translate(...a.add(b).multiplyScalar(0.5).toArray());
    add(geometry, mat);
  };

  // 所有等级固定为原一级占地和高度；升级只改变装饰，不改变体积。
  const length = 1.15;
  const width = 1.06;
  const peak = 2.4;
  const floor = 0.08;
  const apex: Point = [0, peak, 0];
  const corner = (x: number, z: number): Point => [x * length, floor, z * width];
  const slopePoint = (base: Point, t: number, lift = 0): Point =>
    [base[0] * t, peak + (floor - peak) * t + lift, base[2] * t];

  box([length * 2, 0.12, width * 2], [0, floor, 0], wood);
  box([1.42, 0.23, 0.64], [0, 0.255, 0], bedding);
  box([0.28, 0.08, 0.42], [-0.5, 0.41, 0], bedding);
  box([0.85, 0.045, 0.66], [0.23, 0.39, 0], accent);

  for (const side of [-1, 1]) {
    const left = corner(-1, side);
    const right = corner(1, side);
    // 两个完整三角侧面与两个入口面全部汇聚于同一个中心尖顶。
    panel([apex, left, right], canvas);
    beam(left, right, 0.022, trim);
    if (upgraded) {
      panel([slopePoint(left, 0.82, 0.008), slopePoint(right, 0.82, 0.008),
        slopePoint(right, 0.9, 0.008), slopePoint(left, 0.9, 0.008)], accent);
    }
    if (luxury) {
      // 金边和菱形织纹贴在斜篷上，不增加额外顶饰或门廊体积。
      panel([slopePoint(left, 0.8, 0.012), slopePoint(right, 0.8, 0.012),
        slopePoint(right, 0.82, 0.012), slopePoint(left, 0.82, 0.012)], trim);
      const facePoint = (x: number, t: number): Point => [x, peak + (floor - peak) * t + 0.014, side * width * t];
      panel([facePoint(0, 0.4), facePoint(0.14, 0.49), facePoint(0, 0.58), facePoint(-0.14, 0.49)], trim);
    }
  }
  for (const end of [-1, 1]) {
    const left = corner(end, -1);
    const right = corner(end, 1);
    // 洞口处于金字塔斜面上，门楣低于尖顶，不再形成横向屋脊。
    const openingTop = slopePoint([end * length, floor, 0], 0.23);
    const openingLeft: Point = [end * length, floor, -width * 0.78];
    const openingRight: Point = [end * length, floor, width * 0.78];
    panel([apex, left, openingLeft, openingTop], canvas);
    panel([apex, openingTop, openingRight, right], canvas);
    beam(openingTop, openingLeft, upgraded ? 0.03 : 0.018, trim);
    beam(openingTop, openingRight, upgraded ? 0.03 : 0.018, trim);
    for (const side of [-1, 1]) {
      const foot = corner(end, side);
      beam(apex, foot, luxury ? 0.027 : 0.02, trim);
      if (!miniature) {
        const peg: Point = [end * length * 1.13, 0.05, side * width * 1.18];
        beam(slopePoint(foot, 0.65), peg, 0.012, trim);
        box([0.065, 0.16, 0.065], [peg[0], 0.08, peg[2]], wood);
      }
      if (upgraded) {
        // 束起的门帘沿入口边缘垂落，保留中央视线。
        const curtainFoot: Point = [end * length, floor, side * width * 0.88];
        const curtainTop = slopePoint(curtainFoot, 0.56, 0.008);
        beam(curtainTop, curtainFoot, 0.045, canvas);
        const tie = slopePoint(curtainFoot, 0.73, 0.012);
        box([0.07, 0.05, 0.12], tie, trim);
      }
    }
  }
  if (upgraded) {
    box([0.36, 0.12, 0.36], [0.58, 0.2, -0.52], bedding);
    box([0.34, 0.26, 0.3], [-0.56, 0.27, -0.52], wood);
    box([0.37, 0.05, 0.33], [-0.56, 0.425, -0.52], trim);
  }
  if (luxury) {
    box([0.48, 0.025, 1.02], [0.89, 0.155, 0], accent);
    for (const side of [-1, 1]) {
      box([0.48, 0.03, 0.035], [0.89, 0.17, side * 0.48], trim);
    }
    box([0.24, 0.07, 0.34], [-0.47, 0.485, 0], bedding);
  }

  const group = new THREE.Group();
  for (const [mat, geometries] of batches) {
    const merged = mergeGeometries(geometries);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) throw new Error('Cannot merge tent geometry');
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
