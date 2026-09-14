import { mergeClayMeshes } from '../core/mergeClayMeshes';
import { ModelInstances } from '../core/ModelInstances';
import { disposeOwnedMeshes } from '../core/disposeOwnedMeshes';
import * as THREE from 'three';
import { clayMaterial } from '../world/ClayMaterial';


/** 程序化拼装的一格土壤:整格(1×1)深色翻土,相邻土壤的土垄正好接上连成一片;
 * 表面留出三道通贯播种沟(后续种植系统沿用),散几个小土坷垃增加松土质感 */
/** 按落点取 0-1 的确定性伪随机(每格土坷垃的散布不一样,又不随读档/联机重放漂移) */
function cellRandom(x: number, z: number, i: number): number {
  const v = Math.sin(x * 127.1 + z * 311.7 + i * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function makeSoilBase(): THREE.Group {
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
  mergeClayMeshes(g);
  return g;
}

function makeClod(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 5, 4), clayMaterial('#4e3a28')));
  return g;
}

/** 场景中的一格土壤:手持锄头站定自动开出,铲子可以挖掉还原(无掉落),后续种植系统在上面播种 */
export class Soil {
  readonly group: THREE.Group;
  private readonly clods: THREE.Group[] = [];

  constructor(scene: THREE.Scene, position: THREE.Vector3, private readonly instances?: ModelInstances) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);
    if (instances) instances.set(this.group, 'soil:base', makeSoilBase, false);
    else this.group.add(makeSoilBase());
    // 保留每格原有的确定性位置和尺寸，仅共享基础球体；预览仍使用独占网格。
    const { x, z } = position;
    for (let i = 0; i < 4; i++) {
      const clod = instances ? new THREE.Group() : makeClod();
      const s = 0.05 + cellRandom(x, z, i) * 0.025;
      clod.position.set(cellRandom(x, z, i + 10) - 0.5, 0.07, cellRandom(x, z, i + 20) - 0.5);
      clod.scale.set(s, s * 0.7, s);
      this.group.add(clod);
      this.clods.push(clod);
      instances?.set(clod, 'soil:clod', makeClod, false);
      if (instances) clod.matrixAutoUpdate = false;
    }
    if (instances) this.group.matrixAutoUpdate = false;
  }

  remove(scene: THREE.Scene): void {
    this.instances?.delete(this.group);
    for (const clod of this.clods) this.instances?.delete(clod);
    scene.remove(this.group);
    disposeOwnedMeshes(this.group);
  }
}

/** 土壤存档/联机快照(落点) */
export type SoilSave = { id?: string; x: number; y: number; z: number };
