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

  const length = luxury ? 1.35 : upgraded ? 1.25 : 1.15;
  const width = luxury ? 1.3 : upgraded ? 1.18 : 1.06;
  const peak = luxury ? 2.9 : upgraded ? 2.65 : 2.4;
  const floor = 0.08;
  // 坡面从脊顶直达地面，保持标准 A 字三角轮廓。
  // 两整片篷布封住侧面，端面仅留窄边门帘，形成 ⛺ 式三角入口。
  const roofPoint = (x: number, side: number, t: number): Point =>
    [x, peak + (floor - peak) * t, side * width * t];
  box([length * 2, 0.12, width * 2], [0, floor, 0], wood);
  box([1.42, 0.23, 0.64], [0, 0.255, 0], bedding);
  box([0.28, 0.08, 0.42], [-0.5, 0.41, 0], bedding);
  box([0.85, 0.045, 0.66], [0.23, 0.39, 0], accent);
  for (const side of [-1, 1]) {
    // 完整、不透明的落地斜篷是帐篷的主要轮廓，不能卷起或挖空。
    panel([roofPoint(-length, side, 0), roofPoint(length, side, 0),
      roofPoint(length, side, 1), roofPoint(-length, side, 1)], canvas);
    beam(roofPoint(-length, side, 1), roofPoint(length, side, 1), 0.025, trim);
    for (const end of [-1, 1]) {
      const x = end * length;
      // 收向斜边的门帘围出完整的三角洞口，内部卧铺从端面可见。
      const openingTop: Point = [x + end * 0.01, peak - 0.22, 0];
      const openingFoot: Point = [x + end * 0.01, floor, side * width * 0.84];
      panel([roofPoint(x, side, 0), roofPoint(x, side, 1), openingFoot, openingTop], canvas);
      beam(roofPoint(x, side, 0), roofPoint(x, side, 1), 0.035, trim);
      beam(openingTop, openingFoot, 0.018, trim);
      if (!miniature) {
        beam(roofPoint(x, side, 0.62), [x * 1.13, 0.05, side * width * 1.18], 0.012, trim);
        box([0.065, 0.16, 0.065], [x * 1.13, 0.08, side * width * 1.18], wood);
      }
    }
    if (upgraded) {
      for (const x of [-length * 0.65, length * 0.65]) {
        // 浅色缝边贴合完整坡面，保持布面质感而非外露棚架。
        const a = roofPoint(x - 0.025, side, 0);
        const b = roofPoint(x + 0.025, side, 0);
        const c = roofPoint(x + 0.025, side, 1);
        const d = roofPoint(x - 0.025, side, 1);
        for (const point of [a, b, c, d]) point[1] += 0.008;
        panel([a, b, c, d], trim);
      }
    }
  }
  beam([-length - 0.08, peak, 0], [length + 0.08, peak, 0], 0.045, wood);
  if (upgraded) {
    // 陈设靠近敞开的三角入口，便于从外部辨认。
    box([0.42, 0.12, 0.42], [length - 0.4, 0.2, -width * 0.52], bedding);
    box([0.4, 0.32, 0.35], [-length + 0.35, 0.29, -width * 0.52], wood);
    box([0.43, 0.055, 0.38], [-length + 0.35, 0.48, -width * 0.52], trim);
  }
  if (luxury) {
    // 豪华等级用金边三角框、地毯与双枕丰富细节，不遮盖敞开的入口。
    box([0.85, 0.035, 1.1], [length - 0.22, 0.16, 0], accent);
    for (const side of [-1, 1]) {
      box([0.85, 0.04, 0.045], [length - 0.22, 0.18, side * 0.51], trim);
      beam(roofPoint(length + 0.035, side, 0.02), roofPoint(length + 0.035, side, 1), 0.055, trim);
    }
    box([0.24, 0.07, 0.34], [-0.47, 0.485, 0], bedding);
    beam([0, peak, 0], [0, peak + 0.3, 0], 0.022, wood);
    panel([[0, peak + 0.3, 0], [0.32, peak + 0.23, 0], [0, peak + 0.14, 0]], accent);
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
