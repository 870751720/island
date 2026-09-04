import * as THREE from 'three';

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 程序化拼装的波塞冬神像:石砌基座 + 蓝绿宝石座 + 三叉戟,插在浪花石上 */
function makeShrineMesh(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = clayMaterial('#8d99a6');
  const deepMat = clayMaterial('#5d6d7e');

  // 圆形石基座(两层)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.22, 7), stoneMat);
  base.position.y = 0.11;
  base.castShadow = true;
  g.add(base);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 0.18, 7), deepMat);
  upper.position.y = 0.3;
  upper.castShadow = true;
  g.add(upper);

  // 海蓝宝石:祝福之源,微微发亮
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16),
    new THREE.MeshStandardMaterial({
      color: '#2ec4b6',
      flatShading: true,
      roughness: 0.4,
      emissive: '#1a8f85',
    })
  );
  gem.position.y = 0.56;
  gem.castShadow = true;
  g.add(gem);

  // 三叉戟:木柄 + 三齿
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.3, 5), clayMaterial('#8a6239'));
  shaft.position.y = 1.2;
  shaft.castShadow = true;
  g.add(shaft);
  const prongMat = clayMaterial('#c9a15c');
  for (const dx of [-0.14, 0, 0.14]) {
    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 4), prongMat);
    prong.position.set(dx, 1.95, 0);
    if (dx !== 0) prong.rotation.z = dx > 0 ? -0.22 : 0.22;
    prong.castShadow = true;
    g.add(prong);
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.05), prongMat);
  cross.position.y = 1.8;
  g.add(cross);

  return g;
}

/** 场景中的波塞冬神像摆件(可放置多个),放置期间全岛钓鱼杂物概率降低 */
export class Shrine {
  readonly group: THREE.Group;
  private gem: THREE.Mesh;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(this.group);
    const mesh = makeShrineMesh();
    this.gem = mesh.children.find(
      (c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.OctahedronGeometry
    ) as THREE.Mesh;
    this.group.add(mesh);
  }

  /** 宝石缓慢旋转、微微起伏的常驻表现 */
  update(delta: number, elapsed: number): void {
    if (!this.gem) return;
    this.gem.rotation.y += delta * 1.2;
    this.gem.position.y = 0.56 + Math.sin(elapsed * 2) * 0.03;
  }
}
