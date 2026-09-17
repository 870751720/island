import * as THREE from 'three';
import { clayMaterial } from '../world/ClayMaterial';
import { mergeClayMeshes } from '../core/mergeClayMeshes';

export function makeFeedBarrelModel(): THREE.Group {
  const group = new THREE.Group();
  const wood = clayMaterial('#a17a4d');
  const iron = clayMaterial('#7e8a8c');
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.12, 10), wood);
  base.position.y = 0.1; group.add(base);
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.48, 0.06), wood);
    plank.position.set(Math.sin(angle) * 0.36, 0.29, Math.cos(angle) * 0.36);
    plank.rotation.y = angle; group.add(plank);
  }
  for (const y of [0.12, 0.43]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.025, 4, 10), iron);
    band.rotation.x = Math.PI / 2; band.position.y = y; group.add(band);
  }
  group.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  mergeClayMeshes(group);
  return group;
}

export function makeShearsModel(): THREE.Group {
  const group = new THREE.Group();
  const metal = clayMaterial('#bcc7ca');
  const grip = clayMaterial('#946b42');
  for (const side of [-1, 1]) {
    const half = new THREE.Group(); half.rotation.z = side * 0.22;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.31, 0.025), metal);
    blade.position.y = 0.13; half.add(blade);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 4, 8), grip);
    loop.position.y = -0.12; half.add(loop); group.add(half);
  }
  mergeClayMeshes(group);
  return group;
}

export function makeWoolModel(): THREE.Group {
  const group = new THREE.Group();
  const wool = clayMaterial('#eee5d5');
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), wool);
    mesh.position.set(Math.cos(i * 2) * 0.07, (i % 2) * 0.05, Math.sin(i * 2) * 0.07); group.add(mesh);
  }
  mergeClayMeshes(group);
  return group;
}
