import * as THREE from 'three';

/**
 * 把宿主节点下的模型整体下沉 depth,让底座视觉上嵌进地面。
 * 只移动子节点、绝不动宿主自身的 position:宿主位置是权威落点坐标,
 * 会被存档/快照原样序列化,若在这里扣减 y,每次存档→读档往返都会
 * 在构造函数里再扣一次,设施会越读档越陷入地面。
 */
export function sinkModel(host: THREE.Object3D, depth: number): void {
  for (const child of host.children) child.position.y -= depth;
}
