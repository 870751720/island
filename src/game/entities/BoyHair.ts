import * as THREE from 'three';

/** 蓬松短发：圆顶鼓起、几乎没有刘海，低面数黏土块拼装。 */
export function createBoyHair(style: THREE.Group, material: THREE.MeshStandardMaterial): void {
  const ball = new THREE.SphereGeometry(1, 10, 8);
  const oval = (position: [number, number, number], scale: [number, number, number]) => {
    const mesh = new THREE.Mesh(ball.clone().scale(...scale), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    style.add(mesh);
  };

  const cap = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, 1.5);
  const positions = cap.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const bulge = 1 + Math.max(0, y - 0.2) * 0.12;
    positions.setXYZ(i, x * 0.34 * bulge, 0.05 + y * 0.31, z * 0.3 * bulge);
  }
  cap.computeVertexNormals();
  const shell = new THREE.Mesh(cap, material);
  shell.castShadow = true;
  shell.receiveShadow = true;
  style.add(shell);
  oval([0, 0.22, 0.02], [0.22, 0.12, 0.2]);
  oval([0.14, 0.16, 0.12], [0.12, 0.1, 0.11]);
  oval([-0.14, 0.16, 0.1], [0.12, 0.1, 0.11]);
  oval([0, 0.08, -0.18], [0.24, 0.16, 0.14]);
  ball.dispose();
}
