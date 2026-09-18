import * as THREE from 'three';
import { clayMaterial } from '../world/ClayMaterial';
import { mergeClayMeshes } from '../core/mergeClayMeshes';
import type { HiddenFood } from '../systems/HiddenRecipes';

/** 掉落物与手持共用的低面数面点。 */
export function makeHiddenFoodModel(kind: HiddenFood): THREE.Group {
  const group = new THREE.Group();
  const add = (shape: THREE.BufferGeometry, color: string, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(shape, clayMaterial(color)); mesh.position.set(x, y, z); mesh.castShadow = true; group.add(mesh); return mesh;
  };
  const cake = kind === 'strawberryCake';
  add(new THREE.CylinderGeometry(0.19, 0.17, cake ? 0.19 : 0.1, 10), cake ? '#f1dbab' : '#cd984e', 0, cake ? 0.12 : 0.08, 0);
  if (cake) {
    add(new THREE.CylinderGeometry(0.192, 0.192, 0.035, 10), '#fff0d9', 0, 0.22, 0);
    add(new THREE.CylinderGeometry(0.19, 0.19, 0.025, 10), '#db8393', 0, 0.12, 0);
    for (const x of [-0.08, 0.08]) add(new THREE.SphereGeometry(0.045, 6, 4), '#dc5262', x, 0.27, 0);
  } else {
    add(new THREE.CylinderGeometry(0.145, 0.145, 0.015, 10), kind === 'applePie' ? '#e5bd64' : '#a66a3e', 0, 0.14, 0);
    for (const x of [-0.08, 0, 0.08]) {
      const strip = add(new THREE.BoxGeometry(0.025, 0.025, 0.25), '#edd397', x, 0.155, 0);
      strip.rotation.y = kind === 'applePie' ? 0.4 : -0.4;
    }
  }
  mergeClayMeshes(group); return group;
}
