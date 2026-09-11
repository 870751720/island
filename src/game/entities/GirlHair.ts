import * as THREE from 'three';

/** 黏土双马尾：与男孩同款圆顶发壳，侧发收成短马尾，贴头的对分刘海。 */
export function createGirlHair(
  style: THREE.Group,
  hair: THREE.MeshStandardMaterial,
  ribbon: THREE.MeshStandardMaterial,
): void {
  const ball = new THREE.SphereGeometry(1, 10, 8);
  const oval = (
    material: THREE.MeshStandardMaterial,
    position: [number, number, number],
    scale: [number, number, number],
    rotation?: [number, number, number],
  ) => {
    const mesh = new THREE.Mesh(ball.clone().scale(...scale), material);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    style.add(mesh);
  };

  const cap = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, 1.55);
  const positions = cap.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const bulge = 1 + Math.max(0, y - 0.15) * 0.14;
    positions.setXYZ(i, x * 0.35 * bulge, 0.045 + y * 0.325, z * 0.305 * bulge);
  }
  cap.computeVertexNormals();
  const shell = new THREE.Mesh(cap, hair);
  shell.castShadow = true;
  shell.receiveShadow = true;
  style.add(shell);
  oval(hair, [0, 0.23, 0.01], [0.2, 0.11, 0.18]);
  oval(hair, [0.14, 0.16, 0.1], [0.12, 0.1, 0.11]);
  oval(hair, [-0.14, 0.16, 0.1], [0.12, 0.1, 0.11]);
  oval(hair, [0, 0.09, -0.2], [0.25, 0.17, 0.14]);
  oval(hair, [0.08, 0.13, 0.24], [0.11, 0.065, 0.068], [0, 0.12, 0.28]);
  oval(hair, [-0.08, 0.13, 0.24], [0.11, 0.065, 0.068], [0, 0.12, -0.28]);
  for (const side of [-1, 1]) {
    oval(hair, [side * 0.28, 0.02, 0.04], [0.085, 0.13, 0.1]);
    oval(hair, [side * 0.34, -0.12, -0.05], [0.1, 0.175, 0.11], [0, 0, side * 0.3]);
    oval(hair, [side * 0.355, -0.26, -0.07], [0.082, 0.095, 0.088], [0, 0, side * 0.18]);
    for (const wing of [-1, 1]) {
      oval(ribbon, [side * 0.3 + wing * 0.038, 0.055, 0.045], [0.046, 0.03, 0.024], [0, 0, wing * 0.5]);
    }
    oval(ribbon, [side * 0.3, 0.055, 0.06], [0.02, 0.022, 0.016]);
  }
  ball.dispose();
}
