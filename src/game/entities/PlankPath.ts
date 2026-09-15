import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { StaticMeshBatch } from '../core/StaticMeshBatch';
import { disposeOwnedMeshes } from '../core/disposeOwnedMeshes';
import { patchSeasonMaterial } from '../world/SeasonVisuals';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { RoadModel, RoadNeighbors } from './RoadModel';

const WOOD = ['#a77c51', '#bc9568', '#96734f', '#b18a61'];
function random(x: number, z: number, i: number): number {
  const v = Math.sin(x * 127.1 + z * 311.7 + i * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

export function plankMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  patchSeasonMaterial(material, 'plain');
  return material;
}

/** 五片留缝旧木板；按坐标改变端头、宽度和色调，无实心方形地基。 */
function plankGeometry(origin: THREE.Vector3, terrain?: IslandTerrain, acrossX = true): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const { x, z } = origin;
  const add = (length: number, width: number, thickness: number, cx: number, cz: number, y: number, color: string) => {
    const source = thickness <= 0.002
      ? new THREE.PlaneGeometry(length, width, 6, 1).rotateX(-Math.PI / 2)
      : new THREE.BoxGeometry(length, thickness, width, 6, 1, 2);
    const geometry = source.toNonIndexed();
    source.dispose();
    const positions = geometry.getAttribute('position');
    const colors: number[] = [];
    const tint = new THREE.Color(color);
    for (let v = 0; v < positions.count; v++) {
      const px = positions.getX(v) + cx, pz = positions.getZ(v) + cz;
      const localX = acrossX ? px : -pz, localZ = acrossX ? pz : px;
      const height = terrain ? terrain.getHeight(x + localX, z + localZ) - origin.y : 0;
      positions.setXYZ(v, localX, positions.getY(v) + y + height, localZ);
      colors.push(tint.r, tint.g, tint.b);
    }
    geometry.deleteAttribute('uv');
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    parts.push(geometry);
  };
  for (let i = 0; i < 5; i++) {
    const length = 0.80 + random(x, z, i * 7) * 0.14;
    const width = 0.12 + random(x, z, i * 7 + 1) * 0.035;
    const cx = (random(x, z, i * 7 + 2) - 0.5) * 0.04;
    const cz = (i - 2) * 0.195 + (random(x, z, i * 7 + 3) - 0.5) * 0.022;
    const tone = Math.floor(random(x, z, i * 7 + 4) * WOOD.length);
    add(length, width, 0.035, cx, cz, 0.037, WOOD[tone]);
    // 一道不等长的细木纹，随木板同样贴地；几何合并后不增加 drawcall。
    add(length * (0.45 + random(x, z, i * 7 + 5) * 0.3), 0.006, 0.002,
      cx + 0.035, cz + width * 0.16, 0.056, '#795b3e');
  }
  const result = mergeGeometries(parts)!;
  for (const part of parts) part.dispose();
  return result;
}

export class PlankPath implements RoadModel {
  readonly group = new THREE.Group();
  private readonly mesh: THREE.Mesh | null;
  constructor(scene: THREE.Scene, position: THREE.Vector3, private readonly batch?: StaticMeshBatch) {
    this.group.position.copy(position);
    scene.add(this.group);
    this.mesh = batch ? null : new THREE.Mesh(plankGeometry(position), plankMaterial());
    if (this.mesh) this.group.add(this.mesh);
  }
  fit(terrain: IslandTerrain, neighbors: RoadNeighbors): void {
    const eastWest = neighbors(-1, 0) || neighbors(1, 0);
    const northSouth = neighbors(0, -1) || neighbors(0, 1);
    const geometry = plankGeometry(this.group.position, terrain, !eastWest || northSouth);
    if (this.batch) this.batch.set(this.group, geometry);
    else if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = geometry;
    }
  }
  remove(scene: THREE.Scene): void {
    this.batch?.delete(this.group);
    scene.remove(this.group);
    disposeOwnedMeshes(this.group);
  }
}
