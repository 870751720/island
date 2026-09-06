import * as THREE from 'three';

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 程序化拼装的纺织机模型:木质机架 + 经线 + 梭子,织布时梭子左右穿行 */
function makeLoomMesh(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = clayMaterial('#8a6239');
  const clothMat = clayMaterial('#e8e2d4');

  // 两侧立柱 + 顶部横梁,撑起经线
  for (const x of [-0.32, 0.32]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.1), woodMat);
    post.position.set(x, 0.4, 0);
    post.castShadow = true;
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.07, 0.09), woodMat);
  beam.position.y = 0.82;
  beam.castShadow = true;
  g.add(beam);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.34), woodMat);
  base.position.y = 0.04;
  g.add(base);

  // 经线:横梁到织口的细线
  const threadMat = clayMaterial('#d9c27a');
  for (let i = 0; i < 5; i++) {
    const thread = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.62, 0.02), threadMat);
    thread.position.set(-0.24 + i * 0.12, 0.45, 0);
    g.add(thread);
  }

  // 已织出的布:挂在机架中下部的整幅布
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.04), clothMat);
  cloth.position.set(0, 0.24, 0);
  cloth.castShadow = true;
  g.add(cloth);

  // 梭子:织布时沿织口左右穿行
  const shuttle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.06), clayMaterial('#6b4a2a'));
  shuttle.position.set(0, 0.58, 0.05);
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

  constructor(scene: THREE.Scene, position: THREE.Vector3, rotY = 0) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y -= 0.02;
    this.group.rotation.y = rotY;
    scene.add(this.group);
    const mesh = makeLoomMesh();
    this.shuttle = mesh.getObjectByName('loomShuttle') ?? null;
    this.group.add(mesh);
  }

  /** 每帧表现:有绳线时梭子左右穿行,空机时停回中位 */
  update(elapsed: number): void {
    if (!this.shuttle) return;
    this.shuttle.position.x = this.rope > 0 ? Math.sin(elapsed * 5) * 0.24 : 0;
  }
}
