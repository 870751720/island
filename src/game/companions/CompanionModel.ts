import type * as THREE from 'three';

/** 程序化模型的可动节点；特殊体型可提供独立动画。 */
export type CompanionModel = {
  group: THREE.Group;
  legs: THREE.Mesh[];
  head: THREE.Object3D;
  tail: THREE.Object3D;
  body: THREE.Object3D;
  update?: (time: number, action: string) => void;
};
