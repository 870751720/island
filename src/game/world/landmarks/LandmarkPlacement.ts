import { Vector3 } from 'three';
import type { IslandTerrain } from '../IslandTerrain';
import type { LandmarkBlueprint } from './LandmarkDefinitions';

export type LandmarkSite = { x: number; z: number; rotation: number; radius: number };
export function landmarkPoint(site: LandmarkSite, x: number, z: number) {
  const c = Math.round(Math.cos(site.rotation)), s = Math.round(Math.sin(site.rotation));
  return { x: site.x + x * c + z * s, z: site.z - x * s + z * c };
}

/** 整片干地检查：水洼岸边优先，边缘退让、高差、营地和已有内容均参与检查。 */
export function findLandmarkSite(
  terrain: IslandTerrain, blueprint: LandmarkBlueprint,
  occupied: (x: number, z: number) => boolean,
  reserved: readonly LandmarkSite[], near?: { x: number; z: number }, rng = Math.random,
  partOccupied: (x: number, z: number) => boolean = () => false,
): LandmarkSite | null {
  const radius = blueprint.radius;
  const spawn = terrain.findSpawnPoint();
  const p = new Vector3();
  const preferPond = !near && rng() < 0.85 && terrain.waterAreas.length > 0;
  for (let attempt = 0; attempt < 1600; attempt++) {
    let x: number, z: number;
    const angle = rng() * Math.PI * 2;
    if (near) {
      const distance = radius + 3 + rng() * (attempt < 600 ? 6 : 24);
      x = near.x + Math.cos(angle) * distance; z = near.z + Math.sin(angle) * distance;
    } else if (preferPond && attempt < 1200) {
      const water = terrain.waterAreas[Math.floor(rng() * terrain.waterAreas.length)];
      const distance = water.radius + radius + 2 + rng() * 7;
      x = water.x + Math.cos(angle) * distance; z = water.z + Math.sin(angle) * distance;
    } else {
      x = (rng() - 0.5) * terrain.width; z = (rng() - 0.5) * terrain.length;
    }
    // 围栏依赖整数顶点网格；中心保持偶数坐标，模板只作四向旋转。
    const site = { x: Math.round(x / 2) * 2, z: Math.round(z / 2) * 2, rotation: Math.floor(rng() * 4) * Math.PI / 2, radius };
    if (!near && Math.hypot(site.x - spawn.x, site.z - spawn.z) < radius + 55) continue;
    if (reserved.some(s => Math.hypot(s.x - site.x, s.z - site.z) < s.radius + radius + 15)) continue;
    let valid = true;
    for (let dx = -radius; valid && dx <= radius; dx += 2) for (let dz = -radius; dz <= radius; dz += 2) {
      if (dx * dx + dz * dz > radius * radius) continue;
      p.set(site.x + dx, terrain.getHeight(site.x + dx, site.z + dz), site.z + dz);
      if (p.y <= 0.3 || terrain.isNearWater(p, 1.5) || occupied(p.x, p.z)) { valid = false; break; }
    }
    if (!valid) continue;
    // 每件设施的脚下必须足够平；不推平地形，避免改变旧世界坐标和水面。
    for (const part of blueprint.parts) {
      const at = landmarkPoint(site, part.x, part.z);
      if (partOccupied(at.x, at.z)) { valid = false; break; }
      if (part.type === 'gate') {
        const end = landmarkPoint(site, part.x + 2, part.z);
        if (partOccupied(end.x, end.z)) { valid = false; break; }
      }
      const h = terrain.getHeight(at.x, at.z);
      for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        if (Math.abs(terrain.getHeight(at.x + dx, at.z + dz) - h) > 0.65) valid = false;
      }
      if (!valid) break;
    }
    if (valid) return site;
  }
  return null;
}
