import * as THREE from 'three';
import { ModelInstances } from '../core/ModelInstances';
import { disposeOwnedMeshes } from '../core/disposeOwnedMeshes';
import { clayMaterial } from '../world/ClayMaterial';
import type { IslandTerrain } from '../world/IslandTerrain';
import { groundPatchGeometry } from '../world/GroundPatch';
import { GravelSurfaceBatch, gravelCoverage, gravelGroundCoverage, type RoadNeighbors } from './GravelSurface';

export type GravelPathSave = { id?: string; x: number; y: number; z: number };

function random(x: number, z: number, i: number): number {
  const v = Math.sin(x * 127.1 + z * 311.7 + i * 74.7) * 43758.5453;
  return v - Math.floor(v);
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
  private readonly parts: { node: THREE.Group; tone: number; x: number; z: number; scale: THREE.Vector3; rotation: THREE.Quaternion }[] = [];
  private readonly surface: THREE.Mesh | null;
  private readonly instances?: ModelInstances;
  private readonly surfaces?: GravelSurfaceBatch;

  constructor(scene: THREE.Scene, position: THREE.Vector3, rendering?: {
    instances: ModelInstances; surfaces: GravelSurfaceBatch;
  }) {
    this.instances = rendering?.instances;
    this.surfaces = rendering?.surfaces;
    const instances = this.instances;
    this.group.position.copy(position);
    scene.add(this.group);
    this.surface = rendering ? null : new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), clayMaterial('#918775')
    );
    if (this.surface) {
      this.surface.position.y = 0.012;
      this.group.add(this.surface);
    }
    const { x, z } = position;
    const points: { x: number; z: number }[] = [];
    const count = 14 + Math.floor(random(x, z, 901) * 5);
    for (let i = 0; i < 160 && points.length < count; i++) {
      const px = (random(x, z, i * 9 + 1) - 0.5) * 0.82;
      const pz = (random(x, z, i * 9 + 2) - 0.5) * 0.82;
      if (points.some((p) => Math.hypot(p.x - px, p.z - pz) < 0.16)) continue;
      points.push({ x: px, z: pz });
      const tone = Math.floor(random(x, z, i * 9) * COLORS.length);
      const part = instances ? new THREE.Group() : pebble(tone);
      // 带最小间距的不规则散点，避免石子排成网格；边缘石子贴近相邻路面。
      part.position.set(px, 0.038, pz);
      part.scale.set(0.065 + random(x, z, i * 9 + 3) * 0.045,
        0.025 + random(x, z, i * 9 + 4) * 0.02, 0.055 + random(x, z, i * 9 + 5) * 0.05);
      part.rotation.set(random(x, z, i * 9 + 6) * 0.4, random(x, z, i * 9 + 7) * Math.PI * 2, 0);
      this.group.add(part);
      this.parts.push({ node: part, tone, x: px, z: pz, scale: part.scale.clone(), rotation: part.quaternion.clone() });
      instances?.set(part, `gravel:pebble:${tone}`, () => pebble(tone), false);
      if (instances) part.matrixAutoUpdate = false;
    }

  }

  /** 仅落格或邻居变化时更新；地形坡折、碎石局部坡度和外缘混色共用同一地形。 */
  fit(terrain: IslandTerrain, neighbors: RoadNeighbors): void {
    const origin = this.group.position;
    const coverage = (x: number, z: number) => gravelCoverage(x, z, origin.x, origin.z, neighbors);
    const geometry = groundPatchGeometry(terrain, origin, this.surfaces
      ? (x, z) => coverage(x, z) * gravelGroundCoverage(x, z)
      : coverage, this.surfaces ? 0 : 0.25);
    if (this.surfaces) this.surfaces.set(this.group, geometry);
    else if (this.surface) {
      this.surface.geometry.dispose();
      this.surface.geometry = geometry;
      this.surface.position.y = 0;
    }
    const up = new THREE.Vector3(0, 1, 0), normal = new THREE.Vector3();
    const slope = new THREE.Quaternion();
    for (const part of this.parts) {
      const x = origin.x + part.x, z = origin.z + part.z;
      const cover = coverage(x, z);
      normal.set(terrain.getHeight(x - 0.04, z) - terrain.getHeight(x + 0.04, z), 0.08,
        terrain.getHeight(x, z - 0.04) - terrain.getHeight(x, z + 0.04)).normalize();
      slope.setFromUnitVectors(up, normal);
      part.node.position.set(part.x, terrain.getHeight(x, z) - origin.y + 0.014, part.z);
      part.node.quaternion.copy(slope).multiply(part.rotation);
      part.node.scale.copy(part.scale).multiplyScalar(0.25 + cover * 0.75);
      part.node.visible = cover > 0.04;
      part.node.updateMatrix();
      this.instances?.set(part.node, `gravel:pebble:${part.tone}`, () => pebble(part.tone), false);
    }
  }

  remove(scene: THREE.Scene): void {
    this.surfaces?.delete(this.group);
    for (const part of this.parts) this.instances?.delete(part.node);
    scene.remove(this.group);
    disposeOwnedMeshes(this.group);
  }
}
