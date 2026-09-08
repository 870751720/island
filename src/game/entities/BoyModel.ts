import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const BOY_SHIRT_COLOR = '#f4dba1';
export const BOY_SHORTS_COLOR = '#527e94';

function clay(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 朝向 +Z、脚底为原点的黏土小男孩；关节与表面分离，供程序动画和伤口挂载。 */
export function createBoyModel() {
  const root = new THREE.Group();
  // 材质仅在单个玩家内共享，避免受击闪红或换装影响其他玩家。
  const skin = clay('#efbd91');
  const hair = clay('#4b3026');
  const face = clay('#352b2a');
  const blush = clay('#df947c');
  const cream = clay('#fff0cc');
  const shoes = clay('#88583e');
  const torsoMaterial = clay(BOY_SHIRT_COLOR);
  const legMaterial = clay(BOY_SHORTS_COLOR);
  const ball = new THREE.SphereGeometry(1, 10, 8);

  function oval(parent: THREE.Object3D, material: THREE.MeshStandardMaterial,
    position: [number, number, number], scale: [number, number, number]) {
    // 将缩放烘焙到几何体，子节点的工具、伤口和帽子仍使用世界单位。
    const mesh = new THREE.Mesh(ball.clone().scale(...scale), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const torso = oval(root, torsoMaterial, [0, 0.84, 0], [0.25, 0.29, 0.165]);
  oval(root, legMaterial, [0, 0.585, 0], [0.235, 0.115, 0.155]);
  oval(root, skin, [0, 1.09, 0], [0.085, 0.105, 0.085]);
  const head = oval(root, skin, [0, 1.335, 0.015], [0.305, 0.3, 0.265]);
  for (const side of [-1, 1]) {
    oval(head, skin, [side * 0.295, -0.015, 0], [0.065, 0.09, 0.055]);
    oval(head, blush, [side * 0.326, -0.012, 0.028], [0.019, 0.044, 0.022]);
    oval(head, face, [side * 0.105, 0.012, 0.248], [0.026, 0.038, 0.015]);
    oval(head, cream, [side * 0.105 - 0.006, 0.025, 0.26], [0.008, 0.01, 0.005]);
    oval(head, blush, [side * 0.174, -0.058, 0.207], [0.045, 0.022, 0.012]);
  }
  oval(head, skin, [0, -0.035, 0.268], [0.041, 0.043, 0.038]);
  oval(head, face, [0, -0.113, 0.246], [0.038, 0.01, 0.009]);

  // 后脑与半球发帽包住头顶，额前用三束侧分刘海形成清楚的剪影。
  oval(head, hair, [0, 0.045, -0.09], [0.312, 0.273, 0.215]);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2)
    .scale(0.32, 0.225, 0.282), hair);
  cap.position.set(0, 0.115, 0);
  cap.castShadow = true;
  head.add(cap);
  const fringe = oval(head, hair, [-0.115, 0.15, 0.211], [0.158, 0.087, 0.082]);
  fringe.rotation.z = -0.35;
  const fringeTip = oval(head, hair, [0.04, 0.168, 0.234], [0.11, 0.07, 0.067]);
  fringeTip.rotation.z = -0.4;
  oval(head, hair, [0.221, 0.11, 0.127], [0.07, 0.115, 0.1]);

  // 五官与头发没有独立动画，按材质合批，降低手机和多人场景的 drawcall。
  const headParts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const child of [...head.children]) {
    const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    mesh.updateMatrix();
    mesh.geometry.applyMatrix4(mesh.matrix);
    const parts = headParts.get(mesh.material) ?? [];
    parts.push(mesh.geometry);
    headParts.set(mesh.material, parts);
    head.remove(mesh);
  }
  for (const [material, parts] of headParts) {
    const mesh = new THREE.Mesh(mergeGeometries(parts)!, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    head.add(mesh);
    for (const geometry of parts) geometry.dispose();
  }

  const arms: THREE.Group[] = [];
  const legs: THREE.Group[] = [];
  const armSurfaces: THREE.Mesh[] = [];
  const legSurfaces: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.275, 1.005, 0);
    root.add(arm);
    const surface = oval(arm, skin, [side * 0.016, -0.2, 0], [0.073, 0.185, 0.075]);
    oval(arm, torsoMaterial, [0, -0.045, 0], [0.105, 0.125, 0.108]);
    oval(arm, skin, [side * 0.018, -0.365, 0.012], [0.081, 0.09, 0.079]);
    arms.push(arm);
    armSurfaces.push(surface);

    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.59, 0);
    root.add(leg);
    const calf = oval(leg, skin, [0, -0.31, 0], [0.075, 0.19, 0.08]);
    oval(leg, legMaterial, [0, -0.095, 0], [0.108, 0.16, 0.119]);
    oval(leg, cream, [0, -0.425, 0], [0.078, 0.065, 0.084]);
    oval(leg, shoes, [0, -0.505, 0.034], [0.104, 0.085, 0.15]);
    legs.push(leg);
    legSurfaces.push(calf);
  }
  ball.dispose();
  return { root, torso, head, arms, legs, armSurfaces, legSurfaces, torsoMaterial, legMaterial };
}
