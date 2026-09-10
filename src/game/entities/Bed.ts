import * as THREE from 'three';
import { makeTentMesh } from './TentModel';
import { sinkModel } from '../core/sinkModel';

/** 床等级上限 */
export const BED_MAX_LEVEL = 3;

/** 场景中的床摆件(可放置多个),靠近可睡觉跳到第二天清晨 */
export class Bed {
  readonly group: THREE.Group;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    public level = 1,
    rotY = 0
  ) {
    this.level = Math.min(Math.max(level, 1), BED_MAX_LEVEL);
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = rotY;
    scene.add(this.group);
    this.group.add(makeTentMesh(this.level));
    sinkModel(this.group, 0.02);
  }
}
