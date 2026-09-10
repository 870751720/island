import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clayMaterial } from '../world/ClayMaterial';
import { disposeOwnedMeshes } from './disposeOwnedMeshes';

/** 合并独占、静态黏土部件；保留根节点动画，颜色烘焙为顶点色。
 * 仅在创建/换外观时使用。不可传入需要独立动画、显隐或共享资源的部件。
 */
export function mergeClayMeshes(root: THREE.Group): void {
  const batches = new Map<string, { geometries: THREE.BufferGeometry[]; wither: boolean; cast: boolean; receive: boolean }>();
  const identity = new THREE.Matrix4();
  const visit = (object: THREE.Object3D, parentMatrix: THREE.Matrix4): void => {
    object.updateMatrix();
    const matrix = parentMatrix.clone().multiply(object.matrix);
    if (object instanceof THREE.Mesh) {
      const material = object.material as THREE.MeshStandardMaterial;
      const wither = material.customProgramCacheKey() === 'season-snow-wither';
      const key = `${wither}:${object.castShadow}:${object.receiveShadow}`;
      let batch = batches.get(key);
      if (!batch) {
        batch = { geometries: [], wither, cast: object.castShadow, receive: object.receiveShadow };
        batches.set(key, batch);
      }
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(matrix);
      // 当前静态黏土模型无贴图，只保留统一布局的坐标、法线、顶点色。
      for (const name of Object.keys(geometry.attributes)) {
        if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
      }
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
      const count = geometry.getAttribute('position').count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) material.color.toArray(colors, i * 3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.clearGroups();
      batch.geometries.push(geometry);
    }
    for (const child of object.children) visit(child, matrix);
  };
  // 限定输入，避免未来调用误吞透明、贴图、动画或不同 shader 的部件。
  let supported = true;
  root.traverse((object) => {
    if (!object.visible) supported = false;
    if (!(object instanceof THREE.Mesh)) return;
    const mat = object.material;
    if (!(mat instanceof THREE.MeshStandardMaterial) || object instanceof THREE.SkinnedMesh
      || object instanceof THREE.InstancedMesh || mat.map || mat.transparent || mat.opacity !== 1
      || mat.vertexColors || !['season-snow', 'season-snow-wither'].includes(mat.customProgramCacheKey())) supported = false;
  });
  if (!supported) return;
  for (const child of root.children) visit(child, identity);
  const merged: THREE.Mesh[] = [];
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries, false);
    for (const source of batch.geometries) source.dispose();
    if (!geometry) {
      for (const mesh of merged) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
      // 输入属性已标准化；如合并失败，保留完整原模型。
      for (const remaining of batches.values()) for (const source of remaining.geometries) source.dispose();
      return;
    }
    const material = clayMaterial('#ffffff', batch.wither);
    material.vertexColors = true;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = batch.cast;
    mesh.receiveShadow = batch.receive;
    merged.push(mesh);
  }
  disposeOwnedMeshes(root);
  root.clear();
  root.add(...merged);
}
