import * as THREE from 'three';
import type { ResourceKind } from '../systems/Inventory';

/** 设施实体公共生命周期；效果、交互和存储由具体类型或系统实现。 */
export abstract class Facility<K extends ResourceKind = ResourceKind> {
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene, position: THREE.Vector3, readonly kind: K) {
    this.group.position.copy(position);
    this.group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(this.group);
  }

  abstract update(delta: number, elapsed: number): void;

  /** 子类释放独占资源；共享材质、几何体不在此统一销毁。 */
  dispose(): void {}
}
