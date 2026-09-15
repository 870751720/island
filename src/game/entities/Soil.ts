import * as THREE from 'three';
import { ModelInstances } from '../core/ModelInstances';
import type { StaticMeshBatch } from '../core/StaticMeshBatch';
import { disposeOwnedMeshes } from '../core/disposeOwnedMeshes';
import { clayMaterial } from '../world/ClayMaterial';
import type { IslandTerrain } from '../world/IslandTerrain';
import { groundPatchGeometry } from '../world/GroundPatch';
import { groundCoverage, type GroundNeighbors } from '../world/GroundSurface';

/** 按落点取 0-1 的确定性伪随机(每格土坷垃的散布不一样,又不随读档/联机重放漂移) */
function cellRandom(x: number, z: number, i: number): number {
  const v = Math.sin(x * 127.1 + z * 311.7 + i * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function makeClod(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 5, 4), clayMaterial('#4e3a28')));
  return g;
}

/** 场景中的一格土壤:手持锄头站定自动开出,铲子可以挖掉还原(无掉落),后续种植系统在上面播种 */
export class Soil {
  readonly group: THREE.Group;
  private readonly surface: THREE.Mesh | null;
  private readonly clods: THREE.Group[] = [];

  constructor(scene: THREE.Scene, position: THREE.Vector3, private readonly instances?: ModelInstances, private readonly surfaces?: StaticMeshBatch) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);
    this.surface = surfaces ? null : new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), clayMaterial('#5e4530'));
    if (this.surface) this.group.add(this.surface);
    // 保留每格原有的确定性位置和尺寸，仅共享基础球体；预览仍使用独占网格。
    const { x, z } = position;
    for (let i = 0; i < 4; i++) {
      const clod = instances ? new THREE.Group() : makeClod();
      const s = 0.05 + cellRandom(x, z, i) * 0.025;
      clod.position.set(cellRandom(x, z, i + 10) - 0.5, 0.07, cellRandom(x, z, i + 20) - 0.5);
      clod.scale.set(s, s * 0.7, s);
      this.group.add(clod);
      this.clods.push(clod);
      instances?.set(clod, 'soil:clod', makeClod, false);
      if (instances) clod.matrixAutoUpdate = false;
    }

  }

  fit(terrain: IslandTerrain, neighbors: GroundNeighbors): void {
    const origin = this.group.position;
    const coverage = (x: number, z: number) => groundCoverage(x, z, origin.x, origin.z, neighbors);
    // 世界坐标的三道浅土垄在格界连续，外沿随混色一起降回地面。
    const height = (x: number, z: number) => coverage(x, z) *
      (0.008 + 0.035 * Math.pow(0.5 + 0.5 * Math.cos(z * Math.PI * 6), 2));
    const geometry = groundPatchGeometry(terrain, origin, coverage, this.surfaces ? 0 : 0.25,
      { color: new THREE.Color('#5e4530'), height, segments: 12 });
    if (this.surfaces) this.surfaces.set(this.group, geometry);
    else if (this.surface) {
      this.surface.geometry.dispose();
      this.surface.geometry = geometry;
    }
    const up = new THREE.Vector3(0, 1, 0), normal = new THREE.Vector3();
    this.clods.forEach((clod, i) => {
      const x = origin.x + clod.position.x, z = origin.z + clod.position.z;
      const cover = coverage(x, z);
      normal.set(terrain.getHeight(x - 0.04, z) - terrain.getHeight(x + 0.04, z), 0.08,
        terrain.getHeight(x, z - 0.04) - terrain.getHeight(x, z + 0.04)).normalize();
      clod.quaternion.setFromUnitVectors(up, normal);
      clod.position.y = terrain.getHeight(x, z) - origin.y + 0.012 + height(x, z);
      const size = (0.05 + cellRandom(origin.x, origin.z, i) * 0.025) * cover;
      clod.scale.set(size, size * 0.7, size);
      clod.visible = cover > 0.04;
      clod.updateMatrix();
      this.instances?.set(clod, 'soil:clod', makeClod, false);
    });
  }

  remove(scene: THREE.Scene): void {
    this.surfaces?.delete(this.group);
    for (const clod of this.clods) this.instances?.delete(clod);
    scene.remove(this.group);
    disposeOwnedMeshes(this.group);
  }
}

/** 土壤存档/联机快照(落点) */
export type SoilSave = { id?: string; x: number; y: number; z: number };
