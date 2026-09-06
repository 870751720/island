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
 * Lv3 整幅软布床垫 + 白布枕头 + 高床头板与四角雕花柱(顶球) + 床尾板 + 叠搭白毯与皮毛搭毯
 */
function makeBedMesh(level: number): THREE.Group {
  const g = new THREE.Group();
  const woodMat = clayMaterial('#8a6239');
  const luxury = level >= 3;
  const mattressMat = clayMaterial(luxury ? '#efe9dc' : level >= 2 ? '#a5836b' : '#c9a15c');
  const pillowMat = clayMaterial(luxury ? '#fdfaf2' : level >= 2 ? '#efe3d0' : '#7a9b4e');

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

  // 枕头(三级床用双层大枕头,更松软气派)
  const pillowTop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.4), pillowMat);
  pillowTop.position.set(-0.42, mattress.position.y + 0.11, 0);
  pillowTop.castShadow = true;
  g.add(pillowTop);
  if (luxury) {
    const pillowBase = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.46), clayMaterial('#e3dccb'));
    pillowBase.position.set(-0.4, mattress.position.y + 0.06, 0);
    pillowBase.castShadow = true;
    g.add(pillowBase);
  }

  if (isFur) {
    // Lv2 起的木质床头板,三级床更高更宽并带顶檐
    const headH = luxury ? 0.7 : 0.55;
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.1, headH, luxury ? 0.72 : 0.66), woodMat);
    headboard.position.set(-0.7, 0.42, 0);
    headboard.castShadow = true;
    g.add(headboard);
    if (luxury) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.78), woodMat);
      cap.position.set(-0.7, 0.42 + headH / 2 + 0.03, 0);
      cap.castShadow = true;
      g.add(cap);
      // 四角雕花柱(圆柱 + 顶球):立在床垫四角、与床头/床尾板完全脱开,不嵌入板中
      for (const [x, z] of [
        [-0.58, -0.27],
        [-0.58, 0.27],
        [0.56, -0.27],
        [0.56, 0.27],
      ]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.78, 6), woodMat);
        post.position.set(x, 0.58, z);
        post.castShadow = true;
        g.add(post);
        const knob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), woodMat);
        knob.position.set(x, 1.0, z);
        g.add(knob);
      }
      // 床尾板,与床头呼应
      const footboard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.72), woodMat);
      footboard.position.set(0.68, 0.36, 0);
      footboard.castShadow = true;
      g.add(footboard);
    } else {
      for (const z of [-0.26, 0.26]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.75, 6), woodMat);
        post.position.set(-0.66, 0.62, z);
        post.castShadow = true;
        g.add(post);
        const knob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), woodMat);
        knob.position.set(-0.66, 1.02, z);
        g.add(knob);
      }
    }
  }

  // 一床盖到一半的草席/皮毯;三级床叠搭白布毯 + 床尾皮毛搭毯,层次更足
  const blanket = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.05, 0.6),
    clayMaterial(luxury ? '#e3dccb' : isFur ? '#8a6239' : '#9b7b4e')
  );
  blanket.position.set(0.24, mattress.position.y + 0.09, 0);
  blanket.castShadow = true;
  g.add(blanket);
  if (luxury) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.03, 0.2), clayMaterial('#a5836b'));
    trim.position.set(0.64, mattress.position.y + 0.11, 0);
    trim.castShadow = true;
    g.add(trim);
    const drape = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.6), clayMaterial('#a5836b'));
    drape.position.set(0.62, mattress.position.y - 0.06, 0);
    drape.castShadow = true;
    g.add(drape);
  }

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
