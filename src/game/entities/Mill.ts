import * as THREE from 'three';
import { clayMaterial } from '../world/ClayMaterial';
import { mergeClayMeshes } from '../core/mergeClayMeshes';
import { sinkModel } from '../core/sinkModel';

/** 木架承托双层石磨，顶部漏斗进粮；只保留上磨盘与摇柄为动态部件。 */
export function makeMillModel(): THREE.Group {
  const group = new THREE.Group();
  const wood = clayMaterial('#936b45');
  const stone = clayMaterial('#a2a095');
  const dark = clayMaterial('#6d685b');
  const add = (parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  for (const x of [-0.3, 0.3]) for (const z of [-0.25, 0.25]) {
    add(group, new THREE.BoxGeometry(0.1, 0.42, 0.1), wood, x, 0.21, z);
  }
  add(group, new THREE.BoxGeometry(0.82, 0.1, 0.72), wood, 0, 0.43, 0);
  add(group, new THREE.CylinderGeometry(0.36, 0.38, 0.18, 12), dark, 0, 0.57, 0);
  const rotor = new THREE.Group();
  rotor.name = 'millRotor';
  rotor.position.y = 0.73;
  group.add(rotor);
  add(rotor, new THREE.CylinderGeometry(0.34, 0.36, 0.14, 12), stone, 0, 0, 0);
  add(rotor, new THREE.BoxGeometry(0.42, 0.05, 0.06), wood, 0.13, 0.1, 0);
  add(rotor, new THREE.CylinderGeometry(0.035, 0.035, 0.18, 6), wood, 0.32, 0.17, 0);
  add(group, new THREE.CylinderGeometry(0.18, 0.06, 0.22, 6, 1, true), wood, 0, 0.96, 0);
  add(group, new THREE.CylinderGeometry(0.15, 0.15, 0.015, 6), clayMaterial('#d9bc70'), 0, 1.035, 0);
  add(group, new THREE.BoxGeometry(0.16, 0.06, 0.25), wood, 0, 0.51, 0.38);
  const flour = add(group, new THREE.SphereGeometry(0.17, 7, 4), clayMaterial('#f3e7ce'), 0, 0.1, 0.36);
  flour.scale.set(1, 0.45, 0.8);
  mergeClayMeshes(group, [rotor]);
  mergeClayMeshes(rotor);
  return group;
}

export class Mill {
  readonly group = new THREE.Group();
  input = 0;
  output = 0;
  tickLeft = 6;
  private rotor: THREE.Object3D;
  private previousElapsed: number | null = null;

  constructor(scene: THREE.Scene, position: THREE.Vector3, rotY = 0) {
    this.group.position.copy(position);
    this.group.rotation.y = rotY;
    const mesh = makeMillModel();
    this.rotor = mesh.getObjectByName('millRotor')!;
    this.group.add(mesh);
    sinkModel(this.group, 0.02);
    scene.add(this.group);
  }

  update(elapsed: number): void {
    const delta = this.previousElapsed === null ? 0 : Math.max(0, elapsed - this.previousElapsed);
    this.previousElapsed = elapsed;
    if (this.input > 0) this.rotor.rotation.y += Math.min(delta, 0.1) * 1.8;
  }
}
