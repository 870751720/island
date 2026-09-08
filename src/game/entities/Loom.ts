import * as THREE from 'three';

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/**
 * 程序化拼装的纺织机模型,仿真实框架织布机:
 * 底部双轨 + 略后倾的两侧立柱,顶部绕线梁与前方卷布辊之间张一整面斜向经线,
 * 中间的综片杆提起/落下分开经线,织布时梭子沿织口左右穿行。
 */
function makeLoomMesh(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = clayMaterial('#8a6239');
  const darkWoodMat = clayMaterial('#6b4a2a');
  const clothMat = clayMaterial('#e8e2d4');
  const threadMat = clayMaterial('#d9c27a');

  // 底部前后双轨,让机架落地更稳
  for (const z of [-0.16, 0.24]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 0.1), woodMat);
    rail.position.set(0, 0.045, z);
    rail.castShadow = true;
    g.add(rail);
  }

  // 两侧立柱,略向后倾;立柱下方与底轨之间加斜撑
  for (const x of [-0.36, 0.36]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.95, 5), woodMat);
    post.position.set(x, 0.52, -0.1);
    post.rotation.x = -0.08;
    post.castShadow = true;
    g.add(post);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.06), darkWoodMat);
    brace.position.set(x, 0.26, 0.03);
    brace.rotation.x = -0.75;
    g.add(brace);
  }

  // 顶部绕线梁:经线从这里向后下方斜着张到卷布辊
  const warpBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.82, 6), woodMat);
  warpBeam.rotation.z = Math.PI / 2;
  warpBeam.position.set(0, 1.0, -0.16);
  warpBeam.castShadow = true;
  g.add(warpBeam);

  // 前下方卷布辊:已织好的布卷在辊上,随织出进度变粗
  const clothBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.82, 6), clothMat);
  clothBeam.rotation.z = Math.PI / 2;
  clothBeam.position.set(0, 0.36, 0.24);
  clothBeam.castShadow = true;
  clothBeam.name = 'loomClothBeam';
  g.add(clothBeam);

  // 斜向经线面:9 根细线从绕线梁张到卷布辊
  const warpTopY = 0.97;
  const warpTopZ = -0.16;
  const warpLen = Math.hypot(warpTopY - 0.38, warpTopZ - 0.24);
  const warpTilt = Math.atan2(warpTopZ - 0.24, warpTopY - 0.38);
  for (let i = 0; i < 9; i++) {
    const thread = new THREE.Mesh(new THREE.BoxGeometry(0.018, warpLen, 0.018), threadMat);
    thread.position.set(-0.28 + i * 0.07, (warpTopY + 0.38) / 2, (warpTopZ + 0.24) / 2);
    thread.rotation.x = warpTilt;
    g.add(thread);
  }

  // 综片杆:架在经线面上,织布时上下提落
  const heddle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.86, 5), darkWoodMat);
  heddle.rotation.z = Math.PI / 2;
  heddle.position.set(0, 0.66, 0.06);
  heddle.name = 'loomHeddle';
  g.add(heddle);

  // 梭子:织布时沿织口左右穿行(两端收尖的枣核形)
  const shuttle = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), darkWoodMat);
  shuttle.scale.set(1, 0.35, 0.5);
  shuttle.position.set(0, 0.62, 0.12);
  shuttle.name = 'loomShuttle';
  g.add(shuttle);

  return g;
}

/**
 * 场景中的纺织机摆件:投入的绳线每 6 秒织出 1 匹布料;
 * 机内还有绳线时梭子左右穿行,空机时停住。
 */
export class Loom {
  readonly group: THREE.Group;
  /** 机内待织的绳线数 */
  rope = 0;
  /** 已织好待收取的布料数 */
  cloth = 0;
  /** 距离下一次出布的剩余秒数(无绳线时为满值) */
  tickLeft = 0;
  private shuttle: THREE.Object3D | null = null;
  private heddle: THREE.Object3D | null = null;
  private clothBeam: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene, position: THREE.Vector3, rotY = 0) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y -= 0.02;
    this.group.rotation.y = rotY;
    scene.add(this.group);
    const mesh = makeLoomMesh();
    this.shuttle = mesh.getObjectByName('loomShuttle') ?? null;
    this.heddle = mesh.getObjectByName('loomHeddle') ?? null;
    this.clothBeam = mesh.getObjectByName('loomClothBeam') ?? null;
    this.group.add(mesh);
  }

  /** 每帧表现:织布时梭子左右穿行、综片上下提落;卷布辊随积攒的布料变粗 */
  update(elapsed: number): void {
    const weaving = this.rope > 0;
    if (this.shuttle) {
      this.shuttle.position.x = weaving ? Math.sin(elapsed * 5) * 0.26 : 0;
    }
    if (this.heddle) {
      const bob = weaving ? Math.abs(Math.sin(elapsed * 2.5)) * 0.05 : 0;
      this.heddle.position.y = 0.66 + bob;
    }
    if (this.clothBeam) {
      const roll = 1 + Math.min(this.cloth, 8) * 0.08;
      this.clothBeam.scale.y = roll;
      this.clothBeam.scale.z = roll;
    }
  }
}
