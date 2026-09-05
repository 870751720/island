import * as THREE from 'three';
import type { IslandTerrain } from './IslandTerrain';
export type GroundPoint = { x: number; z: number };
export function landCells(terrain: IslandTerrain, step = 4): GroundPoint[] {
  const cells: GroundPoint[] = [], p = new THREE.Vector3();
  for (let x = -terrain.halfWidth + step / 2; x < terrain.halfWidth; x += step) {
    for (let z = -terrain.halfLength + step / 2; z < terrain.halfLength; z += step) {
      p.set(x, terrain.getHeight(x, z), z);
      if (p.y > 0.3 && !terrain.isNearWater(p, 1)) cells.push({ x, z });
    }
  }
  return cells;
}
export function latitude(terrain: IslandTerrain, z: number): number {
  return (terrain.halfLength - z) / terrain.length;
}
/** Four metre corridors and cross-island openings. */
export function isPassage(x: number, z: number): boolean {
  return Math.abs(x - Math.sin(z / 55) * 9) < 2 || Math.abs(z / 40 - Math.round(z / 40)) * 40 < 2;
}
export class SpawnSpacing {
  private cells = new Map<string, { x: number; z: number; radius: number }[]>();
  accepts(x: number, z: number, radius: number): boolean {
    const gx = Math.floor(x / 8), gz = Math.floor(z / 8);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const p of this.cells.get(`${gx + dx},${gz + dz}`) ?? []) {
        if (Math.hypot(x - p.x, z - p.z) < radius + p.radius) return false;
      }
    }
    return true;
  }
  add(x: number, z: number, radius: number): void {
    const key = `${Math.floor(x / 8)},${Math.floor(z / 8)}`;
    const list = this.cells.get(key) ?? [];
    list.push({ x, z, radius });
    this.cells.set(key, list);
  }
}
