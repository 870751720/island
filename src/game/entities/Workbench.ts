import * as THREE from 'three';

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 程序化拼装的工作台模型:木桌面板 + 四条腿 + 桌上小砧石 */
function makeWorkbenchMesh(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = clayMaterial('#8a6239');
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.8), woodMat);
  top.position.y = 0.62;
  top.castShadow = true;
  g.add(top);
  const positions: [number, number][] = [
    [-0.45, -0.3],
    [0.45, -0.3],
    [-0.45, 0.3],
    [0.45, 0.3],
  ];
  for (const [x, z] of positions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.55, 5), woodMat);
    leg.position.set(x, 0.28, z);
    leg.castShadow = true;
    g.add(leg);
  }
  const anvil = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.18, 0),
    clayMaterial('#8d99a6')
  );
  anvil.position.set(0.25, 0.78, 0);
  anvil.castShadow = true;
  g.add(anvil);
  return g;
}

/** 场景中的工作台摆件(全局唯一),制作完成后放置在玩家原位 */
export class Workbench {
  readonly group: THREE.Group;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.group = makeWorkbenchMesh();
    this.group.position.copy(position);
    this.group.position.y -= 0.05;
    scene.add(this.group);
  }
}
