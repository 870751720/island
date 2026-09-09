import * as THREE from 'three';

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 程序化拼装的一格土壤:深色松土方块,表面留出几道播种沟(后续种植系统沿用) */
function makeSoilMesh(): THREE.Group {
  const g = new THREE.Group();
  // 土块:略小于一格的扁方块,微微沉进地面
  const bed = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.1, 0.92), clayMaterial('#6b4f35'));
  bed.position.y = 0.05;
  bed.receiveShadow = true;
  g.add(bed);
  // 播种沟:三道与土块同色的窄高条,翻出土垄的观感
  const ridge = clayMaterial('#7d5c3e');
  for (let i = -1; i <= 1; i++) {
    const row = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.04, 0.1), ridge);
    row.position.set(0, 0.11, i * 0.28);
    g.add(row);
  }
  return g;
}

/** 场景中的一格土壤:手持锄头站定自动开出,铲子可以挖掉还原(无掉落),后续种植系统在上面播种 */
export class Soil {
  readonly group: THREE.Group;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);
    this.group.add(makeSoilMesh());
  }
}

/** 土壤存档/联机快照(落点) */
export type SoilSave = { id?: string; x: number; y: number; z: number };
