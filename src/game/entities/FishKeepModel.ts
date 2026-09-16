import * as THREE from 'three';
import { clayMaterial } from '../world/ClayMaterial';
import { mergeClayMeshes } from '../core/mergeClayMeshes';

/** 开口圆筒鱼护：三道支撑圈、交错绳网和网底；场景、手持及掉落共用。 */
export function makeFishKeepModel(): THREE.Group {
  const group = new THREE.Group();
  const net = clayMaterial('#b6a47b');
  const metal = clayMaterial('#647f79');
  const radius = 0.34;
  const height = 0.62;
  for (const y of [0.045, 0.31, height]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.028, 4, 16), metal);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    group.add(ring);
  }
  const strand = (from: THREE.Vector3, to: THREE.Vector3) => {
    const delta = to.clone().sub(from);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, delta.length(), 3), net);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    group.add(mesh);
  };
  for (let i = 0; i < 12; i++) {
    for (const direction of [-1, 1]) {
      for (let row = 0; row < 4; row++) {
        const angle = (i + direction * row / 2) * Math.PI / 6;
        const next = angle + direction * Math.PI / 12;
        strand(new THREE.Vector3(Math.cos(angle) * radius, 0.05 + row * 0.14, Math.sin(angle) * radius),
          new THREE.Vector3(Math.cos(next) * radius, 0.05 + (row + 1) * 0.14, Math.sin(next) * radius));
      }
    }
    const angle = i * Math.PI / 6;
    strand(new THREE.Vector3(), new THREE.Vector3(Math.cos(angle) * radius, 0.045, Math.sin(angle) * radius));
  }
  mergeClayMeshes(group);
  return group;
}
