import * as THREE from 'three';

/** 黏土连指掌：扁掌心、并指团和拇指凸起，合批后仍用整体缩放表现握拳。 */
export function createClayHand(
  elbow: THREE.Object3D,
  skin: THREE.MeshStandardMaterial,
  side: number,
  oval: (
    parent: THREE.Object3D,
    material: THREE.MeshStandardMaterial,
    position: [number, number, number],
    scale: [number, number, number],
  ) => THREE.Mesh,
): THREE.Group {
  const hand = new THREE.Group();
  hand.position.set(side * 0.006, -0.148, 0.018);
  // 掌面朝向躯干，指端略向前，俯视时能看出宽掌而不是圆球。
  hand.rotation.set(0.42, side * 0.06, side * 0.28);
  elbow.add(hand);
  oval(hand, skin, [0, -0.006, 0.006], [0.036, 0.052, 0.074]);
  oval(hand, skin, [side * 0.004, -0.052, 0.012], [0.032, 0.036, 0.064]);
  oval(hand, skin, [-side * 0.034, -0.012, 0.036], [0.026, 0.044, 0.028]);
  return hand;
}
