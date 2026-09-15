import * as THREE from 'three';
import { clayMaterial } from '../world/ClayMaterial';
import { mergeClayMeshes } from '../core/mergeClayMeshes';
import { disposeOwnedMeshes } from '../core/disposeOwnedMeshes';

export const DOGHOUSE_PAD_HEIGHT = 0.24;

/** 海岛草棚：四柱敞口、棕榈叶顶和布睡垫。世界、安放预览与掉落物共用。 */
export function makeDoghouseModel(): THREE.Group {
  const group = new THREE.Group();
  function part(geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(geometry, clayMaterial(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  const box = (w: number, h: number, d: number, c: string, x: number, y: number, z: number) =>
    part(new THREE.BoxGeometry(w, h, d), c, x, y, z);
  box(1.5, 0.12, 1.6, '#9c7447', 0, 0.06, 0);
  for (const x of [-0.64, 0.64]) for (const z of [-0.65, 0.65]) {
    part(new THREE.CylinderGeometry(0.055, 0.055, 1.06, 6), '#ab8350', x, 0.63, z);
    part(new THREE.CylinderGeometry(0.065, 0.065, 0.07, 6), '#747a71', x, 0.28, z);
  }
  for (let i = 0; i < 4; i++) box(1.28, 0.095, 0.07, '#b99c67', 0, 0.23 + i * 0.15, -0.65);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const leaf = box(0.94, 0.055, 0.235, i % 2 ? '#84924e' : '#a2a261', side * 0.38, 1.25, -0.72 + i * 0.24);
      leaf.rotation.z = -side * 0.38;
    }
    const rail = part(new THREE.CylinderGeometry(0.035, 0.035, 0.82, 6), '#b99c67', side * 0.64, 0.48, -0.21);
    rail.rotation.x = Math.PI / 2;
  }
  const ridge = part(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), '#c7af72', 0, 1.46, 0);
  ridge.rotation.x = Math.PI / 2;
  const pad = part(new THREE.CylinderGeometry(0.46, 0.49, 0.1, 12), '#d2b77c', 0, 0.19, 0.07);
  pad.scale.z = 1.15;
  mergeClayMeshes(group);
  return group;
}

export class Doghouse {
  readonly group = makeDoghouseModel();
  readonly bed: THREE.Vector3;
  readonly entrance: THREE.Vector3;

  constructor(scene: THREE.Scene, at: THREE.Vector3, rotY = 0) {
    this.group.position.copy(at);
    this.group.rotation.y = rotY;
    scene.add(this.group);
    this.bed = this.group.localToWorld(new THREE.Vector3(0, DOGHOUSE_PAD_HEIGHT, 0.07));
    this.entrance = this.group.localToWorld(new THREE.Vector3(0, 0, 0.95));
  }

  dispose(): void {
    this.group.removeFromParent();
    disposeOwnedMeshes(this.group);
  }
}
