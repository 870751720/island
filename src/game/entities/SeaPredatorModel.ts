import * as THREE from 'three';
import { mergeClayMeshes } from '../core/mergeClayMeshes';

/** +X 为头部；静态细节按身体、尾巴、下颌合批，各保留一个动画节点。 */
export function createSeaPredatorModel() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const tail = new THREE.Group();
  const jaw = new THREE.Group();
  const back = '#294852', belly = '#829a94', fin = '#203b46';

  function part(parent: THREE.Group, geometry: THREE.BufferGeometry, color: string,
    position: [number, number, number], scale: [number, number, number] = [1, 1, 1]) {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color, flatShading: true, roughness: 1,
    }));
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }
  function oval(parent: THREE.Group, color: string, pos: [number, number, number], scale: [number, number, number]) {
    return part(parent, new THREE.SphereGeometry(1, 10, 6), color, pos, scale);
  }
  function blade(parent: THREE.Group, points: [number, number][], thickness: number,
    pos: [number, number, number], horizontal = false) {
    const shape = new THREE.Shape();
    points.forEach(([x, y], i) => i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, steps: 1 });
    geometry.translate(0, 0, -thickness / 2);
    const mesh = part(parent, geometry, fin, pos);
    if (horizontal) mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  oval(body, back, [-0.15, 0.17, 0], [1.65, 0.42, 0.62]);
  oval(body, belly, [0.25, 0.045, 0], [1.3, 0.14, 0.55]);
  oval(body, back, [1.12, 0.17, 0], [0.86, 0.25, 0.45]);
  oval(body, '#101e25', [1.43, 0.055, 0], [0.57, 0.095, 0.38]);
  blade(body, [[-0.65, 0], [0.4, 0], [0.04, 0.88], [-0.22, 0.58]], 0.12, [-0.25, 0.4, 0]);
  blade(body, [[-0.3, 0], [0.25, 0], [-0.05, 0.32]], 0.08, [-1.16, 0.28, 0]);
  for (const side of [-1, 1]) {
    blade(body, [[0.4, 0], [-0.6, side * 0.83], [-0.85, side * 0.95], [-0.48, 0]], 0.08, [0.15, 0.09, side * 0.4], true);
    oval(body, '#b99850', [1.28, 0.3, side * 0.35], [0.115, 0.09, 0.05]);
    oval(body, '#080f15', [1.31, 0.31, side * 0.39], [0.052, 0.056, 0.022]);
    for (let i = 0; i < 3; i++) {
      const gill = part(body, new THREE.BoxGeometry(0.035, 0.19, 0.025), fin,
        [0.35 - i * 0.15, 0.24, side * (0.565 + i * 0.008)]);
      gill.rotation.z = -0.2;
    }
    for (let i = 0; i < 5; i++) {
      const tooth = part(body, new THREE.ConeGeometry(0.046, 0.11, 4), '#e4ddbb',
        [1.1 + i * 0.15, 0.015, side * (0.32 - i * 0.035)]);
      tooth.rotation.z = Math.PI;
    }
  }
  jaw.position.set(0.85, 0.035, 0);
  oval(jaw, belly, [0.56, -0.08, 0], [0.63, 0.105, 0.34]);
  oval(jaw, '#443c40', [0.55, 0.005, 0], [0.48, 0.035, 0.27]);
  tail.position.set(-1.35, 0.16, 0);
  oval(tail, back, [-0.42, 0, 0], [0.75, 0.23, 0.29]);
  blade(tail, [[-0.68, 0], [-1.25, 0.85], [-1.5, 1.0], [-1.3, 0.15],
    [-1.28, -0.5], [-1.04, -0.35]], 0.11, [0, 0, 0]);

  for (const group of [body, tail, jaw]) mergeClayMeshes(group);
  root.add(body, tail, jaw);
  const materials: THREE.MeshStandardMaterial[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const material = object.material as THREE.MeshStandardMaterial;
    // 实体部件必须写入深度,由身体遮挡口腔和牙齿,水面在透明阶段自然覆盖水下部分。
    material.transparent = false;
    material.opacity = 1;
    material.depthWrite = true;
    materials.push(material);
  });
  return {
    root,
    animate(elapsed: number, bite: number) {
      tail.rotation.y = Math.sin(elapsed * (bite > 0 ? 9 : 5)) * 0.3;
      jaw.rotation.z = -bite * 0.55;
      body.rotation.x = Math.sin(elapsed * 2.6) * 0.025;
    },
    dispose() {
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      for (const material of materials) material.dispose();
    },
  };
}
