import * as THREE from 'three';

/** 床等级上限 */
export const BED_MAX_LEVEL = 3;

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/**
 * 程序化拼装的床模型,随等级升级:
 * Lv1 木框 + 稻草垫 + 叶子枕;
 * Lv2 加高木框 + 皮毛床垫 + 米白枕头 + 床头板 + 双色皮毯;
 * Lv3 独立重做的豪华大床:深色矮床身 + 厚软布床垫 + 高床头软包 + 床尾矮板 + 双枕 + 白毯叠皮毛搭毯(全方块拼装,无柱状件)
 */
function makeBedMesh(level: number): THREE.Group {
  if (level >= 3) return makeLuxuryBedMesh();
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
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, legH, 0.12), woodMat);
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
    // Lv2 的木质床头板
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.66), woodMat);
    headboard.position.set(-0.7, 0.42, 0);
    headboard.castShadow = true;
    g.add(headboard);
  }

  // 一床盖到一半的草席/皮毯
  const blanket = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.05, 0.6),
    clayMaterial(isFur ? '#9b6b3f' : '#9b7b4e')
  );
  blanket.position.set(0.24, mattress.position.y + 0.09, 0);
  blanket.castShadow = true;
  g.add(blanket);

  return g;
}

/** 三级床豪华大床:整床全用方块拼装,深木色矮床身 + 厚软布床垫,无任何柱状件 */
function makeLuxuryBedMesh(): THREE.Group {
  const g = new THREE.Group();
  const darkWood = clayMaterial('#6e4a28');
  const midWood = clayMaterial('#8a6239');
  const cloth = clayMaterial('#efe9dc');
  const clothShade = clayMaterial('#e3dccb');
  const fur = clayMaterial('#a5836b');

  // 矮床身(深木色整箱,落地感强)
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.82), darkWood);
  base.position.y = 0.11;
  base.castShadow = true;
  g.add(base);

  // 高床头软包:深木外框 + 米白软包内衬 + 顶部木檐,比二级床更气派
  const headFrame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.78, 0.86), darkWood);
  headFrame.position.set(-0.72, 0.39, 0);
  headFrame.castShadow = true;
  g.add(headFrame);
  const headPad = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 0.66), clothShade);
  headPad.position.set(-0.63, 0.44, 0);
  g.add(headPad);
  const headCap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.92), midWood);
  headCap.position.set(-0.72, 0.82, 0);
  headCap.castShadow = true;
  g.add(headCap);

  // 床尾矮板,与床头同材呼应
  const footboard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.86), darkWood);
  footboard.position.set(0.72, 0.17, 0);
  footboard.castShadow = true;
  g.add(footboard);

  // 厚软布床垫(比床身略窄,铺满整个床面)
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.18, 0.7), cloth);
  mattress.position.y = 0.22 + 0.09;
  mattress.castShadow = true;
  g.add(mattress);

  // 双枕:大底枕 + 小顶枕错位叠放
  const pillowBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.5), clothShade);
  pillowBase.position.set(-0.48, mattress.position.y + 0.12, 0);
  pillowBase.castShadow = true;
  g.add(pillowBase);
  const pillowTop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.4), clayMaterial('#fdfaf2'));
  pillowTop.position.set(-0.46, mattress.position.y + 0.2, 0);
  pillowTop.castShadow = true;
  g.add(pillowTop);

  // 白布毯盖住大半床面,毯边压一条皮毛搭毯,床尾再垂下一片皮毛帘
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.72), clothShade);
  blanket.position.set(0.18, mattress.position.y + 0.11, 0);
  blanket.castShadow = true;
  g.add(blanket);
  const furTrim = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.74), fur);
  furTrim.position.set(0.52, mattress.position.y + 0.12, 0);
  furTrim.castShadow = true;
  g.add(furTrim);
  const drape = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.74), fur);
  drape.position.set(0.68, mattress.position.y - 0.05, 0);
  drape.castShadow = true;
  g.add(drape);

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
