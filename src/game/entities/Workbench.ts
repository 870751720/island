import * as THREE from 'three';

/** 工作台等级上限 */
export const WORKBENCH_MAX_LEVEL = 4;

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/**
 * 程序化拼装的工作台模型,随等级升级:
 * Lv1 木桌 + 砧石;Lv2 木桌铺皮毛工作垫 + 抽屉;Lv3 石板桌面 + 背后工具架 + 锤子;Lv4 工具架加顶棚 + 锯子
 */
function makeWorkbenchMesh(level: number): THREE.Group {
  const g = new THREE.Group();
  const woodMat = clayMaterial('#8a6239');
  const stoneMat = clayMaterial('#8d99a6');
  const strawMat = clayMaterial('#c9a15c');
  const metalMat = clayMaterial('#5f6b78');
  const furMat = clayMaterial('#a5836b');

  const isStoneTop = level >= 3;
  const topThick = isStoneTop ? 0.18 : 0.14;
  const topY = 0.62;
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(isStoneTop ? 1.2 : 1.1, topThick, 0.8),
    isStoneTop ? stoneMat : woodMat
  );
  top.position.y = topY;
  top.castShadow = true;
  g.add(top);

  const legX = isStoneTop ? 0.5 : 0.45;
  const positions: [number, number][] = [
    [-legX, -0.3],
    [legX, -0.3],
    [-legX, 0.3],
    [legX, 0.3],
  ];
  for (const [x, z] of positions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.55, 5), woodMat);
    leg.position.set(x, 0.28, z);
    leg.castShadow = true;
    g.add(leg);
  }

  if (level >= 2) {
    // Lv2:桌面铺一张厚皮毛工作垫 + 桌前小抽屉(升级材料是皮毛,表现上也换成皮毛台面)
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.07, 0.62), furMat);
    pad.position.set(-0.08, topY + topThick / 2 + 0.035, 0);
    pad.castShadow = true;
    g.add(pad);
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.08), woodMat);
    drawer.position.set(-0.2, 0.5, 0.42);
    drawer.castShadow = true;
    g.add(drawer);
  }

  const anvil = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + level * 0.02, 0), metalMat);
  anvil.position.set(0.25, topY + topThick / 2 + 0.16, 0);
  anvil.castShadow = true;
  g.add(anvil);

  if (level >= 3) {
    // Lv3:背后立柱 + 工具架,架上挂一把锤子
    for (const x of [-0.55, 0.55]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 5), woodMat);
      post.position.set(x, topY + 0.35, -0.36);
      post.castShadow = true;
      g.add(post);
    }
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.3), woodMat);
    board.position.set(0, topY + 0.62, -0.36);
    board.castShadow = true;
    g.add(board);
    const hammerHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.3, 5),
      clayMaterial('#a97b48')
    );
    hammerHandle.rotation.z = Math.PI / 2;
    hammerHandle.position.set(-0.25, topY + 0.7, -0.36);
    g.add(hammerHandle);
    const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.09), metalMat);
    hammerHead.position.set(-0.25 + 0.18, topY + 0.7, -0.36);
    hammerHead.castShadow = true;
    g.add(hammerHead);
  }

  if (level >= WORKBENCH_MAX_LEVEL) {
    // Lv4:工具架顶棚 + 桌上多一把锯子
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.5), strawMat);
    roof.position.set(0, topY + 0.82, -0.32);
    roof.rotation.x = -0.12;
    roof.castShadow = true;
    g.add(roof);
    const sawBlade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.02), metalMat);
    sawBlade.position.set(-0.25, topY + topThick / 2 + 0.06, 0.1);
    g.add(sawBlade);
    const sawHandle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.05), woodMat);
    sawHandle.position.set(-0.25 - 0.22, topY + topThick / 2 + 0.06, 0.1);
    g.add(sawHandle);
  }

  return g;
}

/** 场景中的工作台摆件(全局唯一),可随等级升级重建模型 */
export class Workbench {
  readonly group: THREE.Group;
  private currentLevel: number;

  constructor(scene: THREE.Scene, position: THREE.Vector3, level = 1, rotY = 0) {
    this.currentLevel = Math.min(Math.max(level, 1), WORKBENCH_MAX_LEVEL);
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y -= 0.05;
    this.group.rotation.y = rotY;
    scene.add(this.group);
    this.rebuild();
  }

  get level(): number {
    return this.currentLevel;
  }

  /** 升一级并重建模型 */
  upgrade(): void {
    if (this.currentLevel >= WORKBENCH_MAX_LEVEL) return;
    this.currentLevel += 1;
    this.rebuild();
  }

  private rebuild(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.group.clear();
    this.group.add(makeWorkbenchMesh(this.currentLevel));
  }
}
