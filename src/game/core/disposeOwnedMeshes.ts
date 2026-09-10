import * as THREE from 'three';

/** 释放模型独占的网格资源；内部克隆共享的资源只释放一次。
 * 不用于与其他存活模型共用几何体/材质的对象，也不接管材质引用的纹理。
 */
export function disposeOwnedMeshes(root: THREE.Object3D, retained: readonly THREE.Object3D[] = []): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
    }
  });
  // 部分静态网格合并时，动态部件仍可能引用同一份资源。
  for (const live of retained) live.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.delete(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.delete(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
