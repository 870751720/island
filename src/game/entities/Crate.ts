import * as THREE from 'three';
import { Inventory } from '../systems/Inventory';

export const CRATE_CAPACITY = 10;

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 程序化拼装的木箱模型:箱体木板 + 顶部两条封边条 */
function makeCrateMesh(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = clayMaterial('#a97b48');
  const bandMat = clayMaterial('#7a5a32');

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.5, 0.5), woodMat);
  body.position.y = 0.25;
  body.castShadow = true;
  g.add(body);

  for (const z of [-0.22, 0.22]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.54, 0.07), bandMat);
    band.position.set(0, 0.25, z);
    band.castShadow = true;
    g.add(band);
  }
  return g;
}

/** 场景中的木箱摆件:自带 10 格收纳空间,靠近可存取物品 */
export class Crate {
  readonly group: THREE.Group;
  readonly storage: Inventory;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y -= 0.02;
    this.group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(this.group);
    this.group.add(makeCrateMesh());
    this.storage = new Inventory();
  }
}
