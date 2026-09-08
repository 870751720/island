import * as THREE from 'three';

export type BurrowState = 'intact' | 'abandoned';

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 程序化拼装的兔子洞模型:土堆环绕黑洞口,周围点缀几丛干草 */
function makeBurrowMesh(): { group: THREE.Group; hole: THREE.Object3D } {
  const g = new THREE.Group();
  const dirtMat = clayMaterial('#8a6f4d');
  const darkMat = clayMaterial('#5e4a33');

  // 环形土堆:八个土块围出洞口
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const lump = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + (i % 3) * 0.02), dirtMat);
    lump.position.set(Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3);
    lump.rotation.set(a, a * 1.7, a * 0.6);
    lump.scale.y = 0.7;
    lump.castShadow = true;
    g.add(lump);
  }

  // 洞口:下陷的深色坑
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.14, 9), clayMaterial('#241c14'));
  hole.position.y = 0.02;
  g.add(hole);

  // 周围干草:斜插的细锥,风里轻颤的观感靠静态随机朝向即可
  const grassMat = clayMaterial('#9aa253');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.28, 4), grassMat);
    blade.position.set(Math.cos(a) * 0.48, 0.1, Math.sin(a) * 0.48);
    blade.rotation.set(Math.cos(a) * 0.35, -a, Math.sin(a) * 0.35);
    g.add(blade);
  }

  // 塌陷痕迹:废弃后替换洞口的一小滩浮土
  const rubble = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.05, 9), darkMat);
  rubble.position.y = 0.02;
  rubble.visible = false;
  rubble.name = 'rubble';
  g.add(rubble);

  return { group: g, hole };
}

/**
 * 场景中的兔子洞:栖息地里兔子的家,受惊的兔子钻进去躲藏;
 * 被铲子挖开后塌成废弃洞,不再提供庇护,等待重新塌出新洞。
 */
export class RabbitBurrow {
  readonly group: THREE.Group;
  state: BurrowState = 'intact';
  private hole: THREE.Object3D;
  private rubble: THREE.Object3D;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    const mesh = makeBurrowMesh();
    this.group = mesh.group;
    this.group.position.copy(position);
    this.hole = mesh.hole;
    this.rubble = mesh.group.getObjectByName('rubble')!;
    scene.add(this.group);
  }

  /** 挖开:洞口塌成浮土痕迹,不再提供庇护 */
  abandon(): void {
    this.state = 'abandoned';
    this.hole.visible = false;
    this.rubble.visible = true;
  }
}
