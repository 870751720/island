import * as THREE from 'three';

/** 脚底为地面原点；仅在装备时创建，所有几何体均为低面数程序模型。 */
export function createSkateboard(): THREE.Group {
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#c18d51', roughness: 1, flatShading: true });
  const grip = new THREE.MeshStandardMaterial({ color: '#427d78', roughness: 1, flatShading: true });
  const wheel = new THREE.MeshStandardMaterial({ color: '#353d48', roughness: 1, flatShading: true });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    root.add(mesh);
    return mesh;
  };
  add(new THREE.BoxGeometry(0.48, 0.08, 1.12), wood, 0, 0.18, 0);
  add(new THREE.BoxGeometry(0.41, 0.012, 0.88), grip, 0, 0.227, 0);
  for (const z of [-0.58, 0.58]) {
    add(new THREE.BoxGeometry(0.46, 0.065, 0.22), wood, 0, 0.21, z).rotation.x = Math.sign(z) * 0.23;
  }
  for (const z of [-0.38, 0.38]) {
    add(new THREE.BoxGeometry(0.53, 0.04, 0.05), wheel, 0, 0.1, z);
    for (const x of [-0.255, 0.255]) {
      add(new THREE.CylinderGeometry(0.095, 0.095, 0.075, 8), wheel, x, 0.095, z).rotation.z = Math.PI / 2;
    }
  }
  return root;
}

export function disposeSkateboard(root: THREE.Group): void {
  const materials = new Set<THREE.Material>();
  root.removeFromParent();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  for (const material of materials) material.dispose();
}
