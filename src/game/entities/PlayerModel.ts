import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { BoyUpperBody } from './BoyUpperBody';
import { createBoyHair } from './BoyHair';
import { BoyHeadShape } from './BoyHeadShape';

export type PlayerGender = 'boy' | 'girl';

export const PLAYER_COLORS = {
  boy: { shirt: '#f4dba1', shorts: '#527e94' },
  girl: { shirt: '#e99b91', shorts: '#85779e' },
} as const;

function clay(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 朝向 +Z、脚底为原点的黏土儿童；关节与表面分离，供程序动画和伤口挂载。 */
export function createPlayerModel() {
  const root = new THREE.Group();
  let currentGender: PlayerGender = 'boy';
  // 材质仅在单个玩家内共享，避免受击闪红或换装影响其他玩家。
  const skin = clay('#efbd91');
  const hair = clay('#4b3026');
  const face = clay('#352b2a');
  const blush = clay('#df947c');
  const cream = clay('#fff0cc');
  const shoes = clay('#88583e');
  const torsoMaterial = clay(PLAYER_COLORS.boy.shirt);
  const legMaterial = clay(PLAYER_COLORS.boy.shorts);
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
  const neck = oval(root, skin, [0, 1.09, 0], [0.085, 0.105, 0.085]);
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

  // 静态五官与两套发型分别合批；切换性别只切显隐，不重建关节或工具。
  function batchParts(parent: THREE.Object3D) {
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const child of [...parent.children]) {
      const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      mesh.updateMatrix();
      mesh.geometry.applyMatrix4(mesh.matrix);
      const parts = batches.get(mesh.material) ?? [];
      parts.push(mesh.geometry);
      batches.set(mesh.material, parts);
      parent.remove(mesh);
    }
    for (const [material, parts] of batches) {
      const mesh = new THREE.Mesh(mergeGeometries(parts)!, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      for (const geometry of parts) geometry.dispose();
    }
  }
  batchParts(head);
  const hairstyles = { boy: new THREE.Group(), girl: new THREE.Group() };
  for (const gender of ['boy', 'girl'] as const) {
    const style = hairstyles[gender];
    if (gender === 'boy') {
      createBoyHair(style, clay('#292725'));
    } else {
      oval(style, hair, [0, 0.045, -0.09], [0.312, 0.273, 0.215]);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2)
        .scale(0.32, 0.225, 0.282), hair);
      cap.position.set(0, 0.115, 0);
      style.add(cap);
      const ribbon = clay('#d66b70');
      for (const side of [-1, 1]) {
        const fringe = oval(style, hair, [side * 0.12, 0.15, 0.21], [0.16, 0.082, 0.084]);
        fringe.rotation.z = side * 0.3;
        oval(style, hair, [side * 0.263, 0.015, 0.095], [0.064, 0.16, 0.095]);
        const tail = oval(style, hair, [side * 0.36, -0.095, -0.075], [0.112, 0.22, 0.122]);
        tail.rotation.z = side * 0.28;
        for (const wing of [-1, 1]) {
          const bow = oval(style, ribbon, [side * 0.34 + wing * 0.04, 0.04, 0.035], [0.053, 0.034, 0.028]);
          bow.rotation.z = wing * 0.45;
        }
        oval(style, ribbon, [side * 0.34, 0.04, 0.057], [0.023, 0.026, 0.019]);
      }
    }
    batchParts(style);
    style.visible = gender === 'boy';
    head.add(style);
  }

  const upperBody = new THREE.Group();
  upperBody.position.y = 0.59;
  root.add(upperBody);
  // 腰部为上身旋转中心，保留网格原有世界位置。
  for (const part of [torso, head, neck]) {
    part.position.y -= 0.59;
    upperBody.add(part);
  }
  const hands: THREE.Mesh[] = [];
  const elbows: THREE.Group[] = [];
  const knees: THREE.Group[] = [];
  const ankles: THREE.Group[] = [];
  const arms: THREE.Group[] = [];
  const sleeves: THREE.Mesh[] = [];
  const legs: THREE.Group[] = [];
  const armSurfaces: THREE.Mesh[] = [];
  const legSurfaces: THREE.Mesh[] = [];
  // 朝向 +Z 时，角色自身左侧为 +X、右侧为 -X；数组统一 [左, 右]。
  for (const side of [1, -1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.275, 1.005 - 0.59, 0);
    upperBody.add(arm);
    oval(arm, skin, [side * 0.008, -0.105, 0], [0.074, 0.115, 0.075]);
    const elbow = new THREE.Group();
    elbow.position.set(side * 0.012, -0.21, 0);
    arm.add(elbow);
    elbows.push(elbow);
    const surface = oval(elbow, skin, [0, -0.067, 0], [0.071, 0.105, 0.074]);
    sleeves.push(oval(arm, torsoMaterial, [0, -0.045, 0], [0.105, 0.125, 0.108]));
    hands.push(oval(elbow, skin, [side * 0.006, -0.155, 0.012], [0.081, 0.09, 0.079]));
    arms.push(arm);
    armSurfaces.push(surface);

    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.59, 0);
    root.add(leg);
    const knee = new THREE.Group();
    knee.position.y = -0.25;
    leg.add(knee);
    knees.push(knee);
    const calf = oval(knee, skin, [0, -0.09, 0], [0.075, 0.15, 0.08]);
    oval(leg, legMaterial, [0, -0.095, 0], [0.108, 0.16, 0.119]);
    const ankle = new THREE.Group();
    ankle.position.y = -0.2;
    knee.add(ankle);
    ankles.push(ankle);
    oval(ankle, cream, [0, 0.025, 0], [0.078, 0.065, 0.084]);
    oval(ankle, shoes, [0, -0.055, 0.034], [0.104, 0.085, 0.15]);
    legs.push(leg);
    legSurfaces.push(calf);
  }
  ball.dispose();
  const headShape = new BoyHeadShape(head, hairstyles.boy);
  headShape.apply(true);
  const upperShape = new BoyUpperBody(head, torso, neck, sleeves);
  upperShape.apply(true);
  const boyMouth = new THREE.Vector3(0, -0.113 * 1.025, 0.246 * 0.94);
  const girlMouth = new THREE.Vector3(0, -0.113, 0.246);
  return {
    root, upperBody, torso, head, arms, legs, elbows, knees, ankles, hands, armSurfaces, legSurfaces, torsoMaterial, legMaterial,
    get useBoyGait() { return currentGender === 'boy'; },
    get mouthPosition() { return currentGender === 'boy' ? boyMouth : girlMouth; },
    dispose() { upperShape.dispose(); },
    setGender(gender: PlayerGender) {
      currentGender = gender;
      headShape.apply(gender === 'boy');
      upperShape.apply(gender === 'boy');
      hairstyles.boy.visible = gender === 'boy';
      hairstyles.girl.visible = gender === 'girl';
    },
  };
}
