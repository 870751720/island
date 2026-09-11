import * as THREE from 'three';

/** 黏土握拳：拳体截面接近前臂、长度约为前臂四成，拇指扣在拳侧。 */
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
  hand.position.set(side * 0.004, -0.17, 0.012);
  hand.rotation.set(0.12, 0, side * 0.22);
  elbow.add(hand);
  oval(hand, skin, [0, -0.008, 0.006], [0.06, 0.05, 0.056]);
  oval(hand, skin, [0, -0.04, 0.02], [0.056, 0.03, 0.05]);
  const thumb = oval(hand, skin, [-side * 0.044, -0.006, 0.026], [0.018, 0.028, 0.022]);
  thumb.rotation.set(0.35, side * 0.65, -side * 1.05);
  return hand;
}
