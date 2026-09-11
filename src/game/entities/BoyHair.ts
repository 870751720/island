import * as THREE from 'three';

/** 微分碎盖：贴合后脑、顶部轻蓬松、偏中窄分缝与长短交错的垂落刘海。 */
export function createBoyHair(style: THREE.Group, material: THREE.MeshStandardMaterial): void {
  const add = (position: [number, number, number], size: [number, number, number], tilt = 0) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6).scale(...size), material);
    mesh.position.set(...position);
    mesh.rotation.z = tilt;
    style.add(mesh);
  };
  add([0, 0.06, -0.09], [0.308, 0.26, 0.213]);
  add([-0.12, 0.205, 0.015], [0.205, 0.139, 0.259], -0.13);
  add([0.14, 0.202, 0.018], [0.178, 0.132, 0.252], 0.15);
  for (let i = 0; i < 8; i++) {
    const x = (i - 3.5) * 0.067;
    const side = x < 0.02 ? -1 : 1;
    const edge = Math.abs(x) / 0.24;
    const length = 0.095 + (i % 3) * 0.012;
    add([x, 0.142 + edge * 0.01, 0.244 - edge * edge * 0.046],
      [0.049, length, 0.046], side * 0.19);
  }
  for (const side of [-1, 1]) add([side * 0.285, 0.057, 0.028], [0.036, 0.112, 0.124], side * 0.08);
}
