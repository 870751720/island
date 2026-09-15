import * as THREE from 'three';
import { ModelInstances } from '../core/ModelInstances';
import { disposeOwnedMeshes } from '../core/disposeOwnedMeshes';
import { clayMaterial } from '../world/ClayMaterial';

export type GravelPathSave = { id?: string; x: number; y: number; z: number };

function random(x: number, z: number, i: number): number {
  const v = Math.sin(x * 127.1 + z * 311.7 + i * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function base(): THREE.Group {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.025, 1), clayMaterial('#918775'));
  mesh.position.y = 0.018;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

const COLORS = ['#aca99b', '#85877f', '#bcb29b', '#777a75'];
function pebble(tone: number): THREE.Group {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), clayMaterial(COLORS[tone]));
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

/** 坐标决定碎石散布；共享低面数石子模板，连续铺路不会重复整格纹样。 */
export class GravelPath {
  readonly group = new THREE.Group();
  private readonly parts: THREE.Group[] = [];

  constructor(scene: THREE.Scene, position: THREE.Vector3, private readonly instances?: ModelInstances) {
    this.group.position.copy(position);
    scene.add(this.group);
    if (instances) instances.set(this.group, 'gravel:base', base, false);
    else this.group.add(base());
    const { x, z } = position;
    const points: { x: number; z: number }[] = [];
    const count = 25 + Math.floor(random(x, z, 901) * 7);
    for (let i = 0; i < 160 && points.length < count; i++) {
      const px = (random(x, z, i * 9 + 1) - 0.5) * 0.82;
      const pz = (random(x, z, i * 9 + 2) - 0.5) * 0.82;
      if (points.some((p) => Math.hypot(p.x - px, p.z - pz) < 0.115)) continue;
      points.push({ x: px, z: pz });
      const tone = Math.floor(random(x, z, i * 9) * COLORS.length);
      const part = instances ? new THREE.Group() : pebble(tone);
      // 带最小间距的不规则散点，避免石子排成网格；边缘石子贴近相邻路面。
      part.position.set(px, 0.038, pz);
      part.scale.set(0.065 + random(x, z, i * 9 + 3) * 0.045,
        0.025 + random(x, z, i * 9 + 4) * 0.02, 0.055 + random(x, z, i * 9 + 5) * 0.05);
      part.rotation.set(random(x, z, i * 9 + 6) * 0.4, random(x, z, i * 9 + 7) * Math.PI * 2, 0);
      this.group.add(part);
      this.parts.push(part);
      instances?.set(part, `gravel:pebble:${tone}`, () => pebble(tone), false);
      if (instances) part.matrixAutoUpdate = false;
    }
    if (instances) this.group.matrixAutoUpdate = false;
  }

  remove(scene: THREE.Scene): void {
    this.instances?.delete(this.group);
    for (const part of this.parts) this.instances?.delete(part);
    scene.remove(this.group);
    disposeOwnedMeshes(this.group);
  }
}
