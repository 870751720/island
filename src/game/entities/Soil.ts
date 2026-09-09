import * as THREE from 'three';
import { clayMaterial } from '../world/ClayMaterial';


/** 程序化拼装的一格土壤:整格(1×1)深色翻土,相邻土壤的土垄正好接上连成一片;
 * 表面留出三道通贯播种沟(后续种植系统沿用),散几个小土坷垃增加松土质感 */
/** 按落点取 0-1 的确定性伪随机(每格土坷垃的散布不一样,又不随读档/联机重放漂移) */
function cellRandom(x: number, z: number, i: number): number {
  const v = Math.sin(x * 127.1 + z * 311.7 + i * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function makeSoilMesh(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  // 土床:整格扁方块,微微沉进地面,边缘与相邻土壤严丝合缝
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1, 0.07, 1), clayMaterial('#5e4530'));
  bed.position.y = 0.035;
  bed.receiveShadow = true;
  g.add(bed);
  // 土垄:三道通贯整格的拱起条(间距 1/3 格,相邻土壤的垄自然相连)
  const ridge = clayMaterial('#71543c');
  for (let i = -1; i <= 1; i++) {
    const row = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.16), ridge);
    row.position.set(0, 0.075, i / 3);
    row.receiveShadow = true;
    g.add(row);
  }
  // 小土坷垃:散落的深色小团,翻土的手工质感;散布按落点伪随机,各格不同
  const clod = clayMaterial('#4e3a28');
  for (let i = 0; i < 4; i++) {
    const s = 0.05 + cellRandom(x, z, i) * 0.025;
    const lump = new THREE.Mesh(new THREE.SphereGeometry(s, 5, 4), clod);
    lump.position.set(cellRandom(x, z, i + 10) - 0.5, 0.07, cellRandom(x, z, i + 20) - 0.5);
    lump.scale.y = 0.7;
    g.add(lump);
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
    this.group.add(makeSoilMesh(position.x, position.z));
  }
}

/** 土壤存档/联机快照(落点) */
export type SoilSave = { id?: string; x: number; y: number; z: number };
