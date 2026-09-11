import * as THREE from 'three';

/** 短碎盖发：圆顶贴头、侧分刘海、耳上短鬓，低面数黏土块拼装。 */
export function createBoyHair(style: THREE.Group, material: THREE.MeshStandardMaterial): void {
  const ball = new THREE.SphereGeometry(1, 10, 8);
  const oval = (position: [number, number, number], scale: [number, number, number],
    rotation?: [number, number, number]) => {
    const mesh = new THREE.Mesh(ball.clone().scale(...scale), material);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    style.add(mesh);
  };

  const cap = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, 1.42);
  const positions = cap.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    // 圆顶略高于头皮；侧面贴头，后脑发际下收，额前留出额头给刘海。
    let px = x * 0.325 * (0.96 + y * 0.04);
    let py = 0.028 + y * 0.292 + Math.max(0, y - 0.65) * 0.05;
    let pz = z * 0.286 - 0.018;
    if (z < 0) py -= (1 - y) * -z * 0.11;
    if (z > 0.25) py += (z - 0.25) * 0.04;
    positions.setXYZ(i, px, py, pz);
  }
  cap.computeVertexNormals();
  const shell = new THREE.Mesh(cap, material);
  shell.castShadow = true;
  shell.receiveShadow = true;
  style.add(shell);

  oval([-0.04, 0.125, 0.228], [0.175, 0.072, 0.082], [0.42, 0.18, 0.32]);
  oval([0.11, 0.108, 0.232], [0.138, 0.068, 0.076], [0.48, -0.22, -0.12]);
  oval([-0.155, 0.1, 0.195], [0.108, 0.078, 0.07], [0.32, 0.38, 0.22]);
  for (const side of [-1, 1] as const) {
    oval([side * 0.278, -0.015, 0.04], [0.068, 0.152, 0.118]);
    oval([side * 0.242, 0.055, 0.155], [0.088, 0.095, 0.078], [0.18, side * 0.18, side * 0.12]);
  }
  oval([0.06, 0.238, 0.03], [0.092, 0.05, 0.082], [0.12, 0.35, 0.18]);
  oval([0, 0.04, -0.2], [0.26, 0.175, 0.14]);
  ball.dispose();
}
