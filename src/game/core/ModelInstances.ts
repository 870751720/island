import * as THREE from 'three';
import { disposeOwnedMeshes } from './disposeOwnedMeshes';

type Part = { source: THREE.Mesh; matrix: THREE.Matrix4 };
type Template = { model: THREE.Group; parts: Part[] };
type Entry = { root: THREE.Object3D; matrix: THREE.Matrix4; visible: boolean; dynamic: boolean };
type Batch = { template: Template; entries: Entry[]; meshes: THREE.InstancedMesh[]; dirty: boolean; dynamic: boolean; capacity: number };

/** 按空间格和模型模板实例化。模板部件必须固定、可见、不透明且独占资源；动画保留在实例根节点。
 * 静态实例只在注册时读取变换，移动/显隐变化需重新 set；动态实例在绘制前读取最终变换。
 * 用于位置固定的场景资源；更换空间格时重新 set，场景根变换保持单位矩阵。
 * 模板由池独占，实体只持有无网格的变换节点，移除实体不会释放其他实例的资源。
 */
export class ModelInstances {
  private readonly templates = new Map<string, Template>();
  private readonly batches = new Map<string, Batch>();
  private readonly owners = new Map<THREE.Object3D, Batch>();
  private readonly matrix = new THREE.Matrix4();

  constructor(private readonly scene: THREE.Scene, private readonly cellSize = 16) {}

  set(root: THREE.Object3D, key: string, create: () => THREE.Group, dynamic = true): void {
    this.delete(root);
    let template = this.templates.get(key);
    if (!template) {
      const model = create();
      model.updateMatrixWorld(true);
      const parts: Part[] = [];
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) parts.push({ source: object, matrix: object.matrixWorld.clone() });
      });
      template = { model, parts };
      this.templates.set(key, template);
    }
    root.updateWorldMatrix(true, false);
    const p = root.matrixWorld.elements;
    const batchKey = `${key}:${Math.floor(p[12] / this.cellSize)}:${Math.floor(p[14] / this.cellSize)}`;
    let batch = this.batches.get(batchKey);
    if (!batch) {
      batch = { template, entries: [], meshes: [], dirty: true, dynamic, capacity: 0 };
      this.batches.set(batchKey, batch);
    }
    batch.entries.push({ root, matrix: root.matrixWorld.clone(), visible: this.isVisible(root), dynamic });
    batch.dynamic ||= dynamic;
    batch.dirty = true;
    this.owners.set(root, batch);
  }

  delete(root: THREE.Object3D): void {
    const batch = this.owners.get(root);
    if (!batch) return;
    batch.entries.splice(batch.entries.findIndex((entry) => entry.root === root), 1);
    batch.dirty = true;
    this.owners.delete(root);
  }

  private isVisible(root: THREE.Object3D): boolean {
    for (let node: THREE.Object3D | null = root; node; node = node.parent) {
      if (!node.visible) return false;
    }
    return true;
  }

  /** 在所有玩法/动画更新之后、renderer.render 之前调用，覆盖同帧采集与联机变化。 */
  flush(): void {
    for (const [key, batch] of this.batches) {
      if (batch.entries.length === 0) {
        this.releaseBatch(batch);
        this.batches.delete(key);
        continue;
      }
      if (batch.dynamic) {
        for (const entry of batch.entries) {
          if (!entry.dynamic) continue;
          entry.root.updateWorldMatrix(true, false);
          const visible = this.isVisible(entry.root);
          if (visible !== entry.visible || !entry.matrix.equals(entry.root.matrixWorld)) {
            entry.matrix.copy(entry.root.matrixWorld);
            entry.visible = visible;
            batch.dirty = true;
          }
        }
      }
      if (!batch.dirty) continue;
      if (batch.capacity < batch.entries.length) {
        this.releaseBatch(batch);
        batch.capacity = Math.max(8, 2 ** Math.ceil(Math.log2(batch.entries.length)));
        batch.meshes = batch.template.parts.map(({ source }) => {
          const mesh = new THREE.InstancedMesh(source.geometry, source.material, batch.capacity);
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.castShadow = source.castShadow;
          mesh.receiveShadow = source.receiveShadow;
          mesh.renderOrder = source.renderOrder;
          mesh.layers.mask = source.layers.mask;
          mesh.matrixAutoUpdate = false;
          this.scene.add(mesh);
          return mesh;
        });
      }
      for (let partIndex = 0; partIndex < batch.meshes.length; partIndex++) {
        const mesh = batch.meshes[partIndex];
        const part = batch.template.parts[partIndex];
        let count = 0;
        for (const entry of batch.entries) {
          if (!entry.visible) continue;
          this.matrix.multiplyMatrices(entry.matrix, part.matrix);
          mesh.setMatrixAt(count++, this.matrix);
        }
        mesh.count = count;
        mesh.visible = count > 0;
        mesh.instanceMatrix.clearUpdateRanges();
        if (count > 0) {
          mesh.instanceMatrix.addUpdateRange(0, count * 16);
          mesh.instanceMatrix.needsUpdate = true;
        }
        // 旋转、缩放、增删都会影响阴影/相机剔除，不能沿用创建时的包围球。
        mesh.computeBoundingSphere();
      }
      batch.dirty = false;
    }
  }

  private releaseBatch(batch: Batch): void {
    for (const mesh of batch.meshes) {
      this.scene.remove(mesh);
      mesh.dispose(); // 仅实例缓冲；geometry/material 由模板继续持有。
    }
    batch.meshes = [];
  }

  dispose(): void {
    for (const batch of this.batches.values()) this.releaseBatch(batch);
    for (const template of this.templates.values()) disposeOwnedMeshes(template.model);
    this.batches.clear();
    this.templates.clear();
    this.owners.clear();
  }
}
