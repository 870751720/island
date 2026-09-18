import * as THREE from 'three';
import { Facility } from './Facility';
import { clayMaterial } from '../world/ClayMaterial';
import { mergeClayMeshes } from '../core/mergeClayMeshes';
import { disposeOwnedMeshes } from '../core/disposeOwnedMeshes';

export function makeResearchTableModel(): THREE.Group {
  const group = new THREE.Group();
  const add = (shape: THREE.BufferGeometry, color: string, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(shape, clayMaterial(color));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  for (const x of [-0.36, 0.36]) for (const z of [-0.27, 0.27]) add(new THREE.BoxGeometry(0.1, 0.65, 0.1), '#947048', x, 0.325, z);
  add(new THREE.BoxGeometry(1, 0.12, 0.8), '#b68b58', 0, 0.68, 0);
  add(new THREE.CylinderGeometry(0.22, 0.12, 0.17, 10), '#b6aea0', -0.18, 0.82, 0.05);
  add(new THREE.CylinderGeometry(0.18, 0.18, 0.015, 10), '#e9d5a9', -0.18, 0.9, 0.05);
  const spoon = add(new THREE.BoxGeometry(0.035, 0.03, 0.38), '#735437', -0.13, 0.94, 0.05); spoon.rotation.y = -0.55;
  const book = add(new THREE.BoxGeometry(0.3, 0.04, 0.3), '#f1dfb4', 0.26, 0.77, 0.1); book.rotation.y = 0.12;
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.17, 0.008, 0.012), '#9c8057', 0.26, 0.796, 0.03 + i * 0.06);
  add(new THREE.CylinderGeometry(0.09, 0.08, 0.22, 8), '#c77859', 0.28, 0.85, -0.23);
  mergeClayMeshes(group); return group;
}
export class ResearchTable extends Facility<'researchTable'> {
  constructor(scene: THREE.Scene, position: THREE.Vector3) { super(scene, position, 'researchTable'); this.group.rotation.y = 0; this.group.add(makeResearchTableModel()); }
  update(): void {}
  dispose(): void { disposeOwnedMeshes(this.group); }
}
