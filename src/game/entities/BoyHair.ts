import * as THREE from 'three';

/** 贴头平头：低平顶部、短侧面和完整露出的额头，单片低面数发壳。 */
export function createBoyHair(style: THREE.Group, material: THREE.MeshStandardMaterial): void {
  const geometry = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, 1.32);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const crown = y * 0.319;
    // 顶部压平但始终高于头皮；后侧发际线低于额前。
    const top = crown > 0.27 ? 0.303 + (crown - 0.27) * 0.22 : crown + 0.033;
    const back = (1 - z) * 0.5;
    positions.setXYZ(i, x * 0.315, top - back * 0.14 * (1 - y), z * 0.275);
  }
  geometry.computeVertexNormals();
  style.add(new THREE.Mesh(geometry, material));
}
