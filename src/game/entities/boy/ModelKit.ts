import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Vec3 = [number, number, number];
export interface BoyRig {
  root: THREE.Group;
  upperBody: THREE.Group;
  head: THREE.Mesh;
  torso: THREE.Mesh;
  armSurfaces: THREE.Mesh[];
  legSurfaces: THREE.Mesh[];
  arms: THREE.Group[];
  elbows: THREE.Group[];
  hands: THREE.Mesh[];
  legs: THREE.Group[];
  knees: THREE.Group[];
}

/** 基础几何体烘焙顶点色，每个关节合为一次绘制；不同方案独立塑形。 */
export class ModelKit {
  private parts = new Map<THREE.Object3D, THREE.BufferGeometry[]>();

  add(parent: THREE.Object3D, geometry: THREE.BufferGeometry, color: string,
    position: Vec3, rotation: Vec3 = [0, 0, 0]): void {
    if (geometry.index) {
      const indexed = geometry;
      geometry = geometry.toNonIndexed();
      indexed.dispose();
    }
    geometry.deleteAttribute('uv');
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1)));
    const tint = new THREE.Color(color);
    const colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = tint.r; colors[i + 1] = tint.g; colors[i + 2] = tint.b; }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const parts = this.parts.get(parent) ?? [];
    parts.push(geometry);
    this.parts.set(parent, parts);
  }

  oval(parent: THREE.Object3D, color: string, position: Vec3, size: Vec3, rotation?: Vec3): void {
    this.add(parent, new THREE.SphereGeometry(1, 10, 8).scale(...size), color, position, rotation);
  }

  box(parent: THREE.Object3D, color: string, position: Vec3, size: Vec3, radius = 0.02, rotation?: Vec3): void {
    this.add(parent, new RoundedBoxGeometry(...size, 1, radius), color, position, rotation);
  }

  cone(parent: THREE.Object3D, color: string, position: Vec3, radius: number, height: number, rotation?: Vec3): void {
    this.add(parent, new THREE.ConeGeometry(radius, height, 5), color, position, rotation);
  }

  tube(parent: THREE.Object3D, color: string, position: Vec3, top: number, bottom: number,
    height: number, depth = 1, rotation?: Vec3): void {
    this.add(parent, new THREE.CylinderGeometry(top, bottom, height, 10).scale(1, 1, depth), color, position, rotation);
  }

  capsule(parent: THREE.Object3D, color: string, position: Vec3, radius: number, length: number, depth = 1): void {
    this.add(parent, new THREE.CapsuleGeometry(radius, length, 3, 8).scale(1, 1, depth), color, position);
  }

  /** 轮廓点为 [半径, 高度]，用于一体式上衣和梨形身材。 */
  body(parent: THREE.Object3D, color: string, points: [number, number][], depth: number): void {
    this.add(parent, new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 12)
      .scale(1, 1, depth), color, [0, 0, 0]);
  }

  finish(): { meshes: THREE.Mesh[]; material: THREE.MeshStandardMaterial } {
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
    const meshes: THREE.Mesh[] = [];
    for (const [parent, parts] of this.parts) {
      const geometry = mergeGeometries(parts)!;
      for (const part of parts) part.dispose();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.parts.clear();
    return { meshes, material };
  }
}

export function limbs(kit: ModelKit, rig: BoyRig, options: {
  skin: string; sleeve: string | null; pants: string; shoe: string;
  arm: number; leg: number; sleeveWidth: number; shortsWidth: number;
  trouserLength: number; barefoot?: boolean;
}): void {
  for (let i = 0; i < 2; i++) {
    kit.capsule(rig.arms[i], options.skin, [0, -0.105, 0], options.arm, 0.13);
    if (options.sleeve) kit.tube(rig.arms[i], options.sleeve, [0, -0.06, 0],
      options.sleeveWidth * 0.86, options.sleeveWidth, 0.17);
    kit.capsule(rig.elbows[i], options.skin, [0, -0.065, 0], options.arm * 0.9, 0.12);
    kit.box(rig.hands[i], options.skin, [0, 0, 0.005], [options.arm * 1.9, 0.12, options.arm * 1.4], 0.035);
    kit.capsule(rig.legs[i], options.skin, [0, -0.19, 0], options.leg, 0.1);
    kit.tube(rig.legs[i], options.pants, [0, -0.09, 0], options.shortsWidth, options.shortsWidth * 0.94,
      options.trouserLength, 1.05);
    kit.capsule(rig.knees[i], options.skin, [0, -0.095, 0], options.leg, 0.16);
    kit.box(rig.knees[i], options.barefoot ? options.skin : options.shoe,
      [0, -0.26, 0.035], [options.leg * 2.8, 0.16, 0.29], 0.045);
    if (!options.barefoot) kit.box(rig.knees[i], '#eee4ce', [0, -0.323, 0.035],
      [options.leg * 2.85, 0.034, 0.292], 0.012);
  }
}
