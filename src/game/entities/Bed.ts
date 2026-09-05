import * as THREE from 'three';

/** 床等级上限 */
export const BED_MAX_LEVEL = 2;

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/**
 * 程序化拼装的床模型,随等级升级:
 * Lv1 木框 + 稻草垫 + 叶子枕;Lv2 加高木框 + 皮毛床垫 + 皮毛枕 + 床头板(升级材料是皮毛)
 */
function makeBedMesh(level: number): THREE.Group {
  const g = new THREE.Group();
  const woodMat = clayMaterial('#8a6239');
  const mattressMat = clayMaterial(level >= 2 ? '#a5836b' : '#c9a15c');
  const pillowMat = clayMaterial(level >= 2 ? '#efe3d0' : '#7a9b4e');

  const isFur = level >= 2;
  // 床架
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, isFur ? 0.26 : 0.16, 0.7), woodMat);
  frame.position.y = isFur ? 0.16 : 0.2;
  frame.castShadow = true;
  g.add(frame);

  // 床腿(二级床腿更高,床架抬高)
  const legH = isFur ? 0.24 : 0.14;
  for (const [x, z] of [
    [-0.6, -0.26],
    [0.6, -0.26],
    [-0.6, 0.26],
    [0.6, 0.26],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, legH, 5), woodMat);
    leg.position.set(x, legH / 2, z);
    leg.castShadow = true;
    g.add(leg);
  }

  // 床垫
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.14, 0.58), mattressMat);
  mattress.position.y = (isFur ? 0.16 : 0.2) + (isFur ? 0.13 : 0.08) + 0.07;
  mattress.castShadow = true;
  g.add(mattress);

  // 枕头
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.4), pillowMat);
  pillow.position.set(-0.42, mattress.position.y + 0.11, 0);
  pillow.castShadow = true;
  g.add(pillow);

  if (isFur) {
    // Lv2:木质床头板
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.66), woodMat);
    headboard.position.set(-0.7, 0.42, 0);
    headboard.castShadow = true;
    g.add(headboard);
  }

  // 一床盖到一半的草席/皮毯
  const blanket = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.05, 0.6),
    clayMaterial(isFur ? '#8a6239' : '#9b7b4e')
  );
  blanket.position.set(0.24, mattress.position.y + 0.09, 0);
  blanket.castShadow = true;
  g.add(blanket);

  return g;
}

/** 场景中的床摆件(可放置多个),靠近可睡觉跳到第二天清晨 */
export class Bed {
  readonly group: THREE.Group;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    public level = 1,
    rotY = 0
  ) {
    this.level = Math.min(Math.max(level, 1), BED_MAX_LEVEL);
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y -= 0.02;
    this.group.rotation.y = rotY;
    scene.add(this.group);
    this.group.add(makeBedMesh(this.level));
  }
}
