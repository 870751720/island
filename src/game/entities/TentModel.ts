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

  const length = luxury ? 0.86 : 0.8;
  const width = luxury ? 0.61 : upgraded ? 0.55 : 0.49;
  const eave = luxury ? 0.65 : upgraded ? 0.48 : 0.3;
  const peak = luxury ? 1.62 : upgraded ? 1.37 : 1.16;
  const floor = 0.08;
  // 脊线沿 X，与原睡姿一致；两端敞开，门帘收向两侧。
  box([length * 2, 0.12, width * 2], [0, floor, 0], wood);
  box([1.42, 0.23, 0.64], [0, 0.255, 0], bedding);
  box([0.28, 0.08, 0.42], [-0.5, 0.41, 0], bedding);
  box([0.85, 0.045, 0.66], [0.23, 0.39, 0], accent);
  for (const side of [-1, 1]) {
    const z = side * width;
    panel([[-length, peak, 0], [length, peak, 0], [length, eave, z], [-length, eave, z]], canvas);
    panel([[-length, eave, z], [length, eave, z], [length, floor, z], [-length, floor, z]], canvas);
    beam([-length - 0.035, eave, z], [length + 0.035, eave, z], 0.025, trim);
    for (const end of [-1, 1]) {
      const x = end * length;
      panel([[x, peak, 0], [x, eave, z], [x, floor, z], [x, floor + 0.1, z * 0.76], [x, eave + 0.06, z * 0.62]], canvas);
      beam([x, peak, 0], [x, eave, z], 0.024, trim);
      if (!miniature) {
        beam([x, floor, z], [x, eave + 0.04, z], 0.032, wood);
        beam([x * 0.85, eave, z], [x * 1.09, 0.05, z * 1.2], 0.009, trim);
        box([0.05, 0.12, 0.05], [x * 1.09, 0.06, z * 1.2], wood);
      }
      if (upgraded) box([0.055, 0.055, 0.15], [x, eave * 0.7, z * 0.87], trim);
    }
  }
  beam([-length - 0.08, peak, 0], [length + 0.08, peak, 0], 0.035, wood);
  if (upgraded) {
    // 皮革/织布加强带，沿两侧坡面形成清晰等级细节。
    for (const x of [-0.48, 0.48]) {
      for (const side of [-1, 1]) {
        panel([[x - 0.025, peak + 0.006, 0], [x + 0.025, peak + 0.006, 0],
          [x + 0.025, eave + 0.006, side * (width + 0.006)], [x - 0.025, eave + 0.006, side * (width + 0.006)]], trim);
      }
    }
  }
  if (luxury) {
    // 正门小门廊、青绿地毯与金边垂檐，升级直接改变轮廓。
    const porch = length + 0.3;
    box([0.42, 0.035, 0.72], [length + 0.08, 0.035, 0], accent);
    for (const side of [-1, 1]) {
      panel([[length, peak, 0], [porch, peak - 0.12, 0], [porch, 0.92, side * width], [length, eave, side * width]], canvas);
      panel([[porch, peak - 0.12, 0], [porch, 0.92, side * width], [porch, 0.83, side * width], [porch, peak - 0.21, 0]], trim);
      beam([porch, 0.04, side * width], [porch, 0.94, side * width], 0.025, wood);
    }
    beam([0, peak, 0], [0, peak + 0.28, 0], 0.018, wood);
    panel([[0, peak + 0.28, 0], [0.27, peak + 0.22, 0], [0, peak + 0.13, 0]], accent);
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
