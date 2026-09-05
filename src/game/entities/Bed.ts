import * as THREE from 'three';

/** 床等级上限 */
export const BED_MAX_LEVEL = 3;

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/**
 * 程序化拼装的床模型,随等级升级:
 * Lv1 木框 + 稻草垫 + 叶子枕;Lv2 加高木框 + 皮毛床垫 + 皮毛枕 + 床头板;
 * Lv3 皮毛床外加一顶布帘帐篷(A 形坡面 + 床头三角墙,床尾敞开)
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

  if (level >= 3) addTent(g);

  return g;
}

/** 三级床帐篷罩:两面拼接布帘坡面 + 前后三角墙(正面留门洞),床头封住、床尾开门 */
function addTent(g: THREE.Group): void {
  const clothMat = new THREE.MeshStandardMaterial({ color: '#7d9a6e', flatShading: true, roughness: 1 });
  const clothAltMat = new THREE.MeshStandardMaterial({ color: '#6f8c62', flatShading: true, roughness: 1 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#8a6239', flatShading: true, roughness: 1 });
  const ridge = 1.35; // 屋脊高
  const halfW = 0.85; // 半跨
  const len = 2.0; // 帐篷沿床身方向长
  const slope = Math.hypot(ridge, halfW);
  const tilt = Math.atan2(halfW, ridge);

  // 两面坡各由三块布片拼成,布片间留缝、双色相间,更像缝出来的帐篷
  const segLen = (len - 0.08) / 3;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(segLen, 0.04, slope),
        i % 2 === 0 ? clothMat : clothAltMat
      );
      panel.rotation.x = side * tilt;
      panel.position.set(-len / 2 + segLen / 2 + i * (segLen + 0.04), ridge / 2, (side * halfW) / 2);
      panel.castShadow = true;
      g.add(panel);
    }
  }

  // 屋脊撑杆 + 两端立柱,撑起整顶帐篷
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 5), woodMat);
  pole.rotation.z = Math.PI / 2;
  pole.position.y = ridge;
  pole.castShadow = true;
  g.add(pole);
  for (const x of [-len / 2, len / 2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, ridge, 5), woodMat);
    post.position.set(x, ridge / 2, 0);
    post.castShadow = true;
    g.add(post);
  }

  const wallShape = (door: boolean): THREE.Shape => {
    const shape = new THREE.Shape([
      new THREE.Vector2(-halfW, 0),
      new THREE.Vector2(halfW, 0),
      new THREE.Vector2(0, ridge),
    ]);
    if (door) {
      // 正面门洞:中部一个倒梯形口,能看见帐内的床
      shape.holes.push(
        new THREE.Path([
          new THREE.Vector2(-halfW * 0.45, 0),
          new THREE.Vector2(halfW * 0.45, 0),
          new THREE.Vector2(halfW * 0.3, ridge * 0.55),
          new THREE.Vector2(-halfW * 0.3, ridge * 0.55),
        ])
      );
    }
    return shape;
  };
  for (const [x, door] of [
    [-len / 2, false],
    [len / 2, true],
  ] as [number, boolean][]) {
    const wall = new THREE.Mesh(
      new THREE.ExtrudeGeometry(wallShape(door), { depth: 0.05, bevelEnabled: false }),
      clothMat
    );
    wall.rotation.y = Math.PI / 2;
    wall.position.set(x, 0, 0);
    wall.castShadow = true;
    g.add(wall);
  }
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
