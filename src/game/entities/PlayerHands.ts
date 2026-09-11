import * as THREE from 'three';

/** 黏土连指掌：腕窄于掌、掌略长于宽、并指约等于掌长、拇指从桡侧斜出。 */
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
  hand.position.set(side * 0.004, -0.152, 0.01);
  // 自然下垂时掌心向内、指端略向前，不做大幅度扭转。
  hand.rotation.set(0.18, 0, side * 0.12);
  elbow.add(hand);
  oval(hand, skin, [0, 0.018, 0], [0.022, 0.02, 0.026]);
  oval(hand, skin, [0, -0.03, 0.004], [0.02, 0.044, 0.04]);
  oval(hand, skin, [0, -0.098, 0.008], [0.017, 0.048, 0.033]);
  const thumb = oval(hand, skin, [-side * 0.004, -0.022, 0.044], [0.014, 0.036, 0.015]);
  thumb.rotation.set(1.05, side * 0.12, -side * 0.4);
  return hand;
}
