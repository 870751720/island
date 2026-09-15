import * as THREE from 'three';
import { Bed } from '../../../entities/Bed';
import { Campfire } from '../../../entities/Campfire';
import { Crate } from '../../../entities/Crate';
import { Workbench } from '../../../entities/Workbench';
import { BaitBarrel } from '../../../entities/BaitBarrel';
import { BrewBarrel } from '../../../entities/BrewBarrel';
import { Smelter } from '../../../entities/Smelter';
import { Loom } from '../../../entities/Loom';
import { buildFenceMesh } from '../../../entities/Fence';
import { FenceGate } from '../../../entities/FenceGate';
import { Shrine } from '../../../entities/Shrine';
import { Soil } from '../../../entities/Soil';
import { Crop, CROP_SPECS } from '../../../entities/Crop';
import { LightPool } from '../../LightPool';
import type { LandmarkBlueprint } from '../LandmarkDefinitions';

export function populatePreview(scene: THREE.Scene, blueprint: LandmarkBlueprint) {
  const lights = new LightPool(scene, 4);
  const animated: Shrine[] = [];
  const posts = new Set<string>();
  for (const p of blueprint.parts) {
    if (p.type === 'fence' || p.type === 'gate') posts.add(`${p.x},${p.z}`);
    if (p.type === 'gate') posts.add(`${p.x + 2},${p.z}`);
  }
  const connections = (x: number, z: number) => ({
    px: posts.has(`${x + 1},${z}`), nx: posts.has(`${x - 1},${z}`),
    pz: posts.has(`${x},${z + 1}`), nz: posts.has(`${x},${z - 1}`),
  });
  for (const p of blueprint.parts) {
    const at = new THREE.Vector3(p.x, 0, p.z);
    const rot = p.rotation ?? 0;
    switch (p.type) {
      case 'bed': new Bed(scene, at, p.level, rot); break;
      case 'fire': new Campfire(scene, at, 0); break;
      case 'crate': new Crate(scene, at, 'crate', rot); break;
      case 'bench': new Workbench(scene, at, p.level, rot); break;
      case 'bait': new BaitBarrel(scene, at, rot); break;
      case 'brew': new BrewBarrel(scene, at, rot); break;
      case 'smelter': new Smelter(scene, at, rot); break;
      case 'loom': new Loom(scene, at, rot); break;
      case 'gate': {
        const gate = new FenceGate(scene, p.x, p.z, 'x', 0);
        gate.rebuildRails({ start: connections(p.x, p.z), end: connections(p.x + 2, p.z) });
        break;
      }
      case 'fence': {
        const mesh = buildFenceMesh(p.stone ? 'stone' : 'branch', {
          px: posts.has(`${p.x + 1},${p.z}`), nx: posts.has(`${p.x - 1},${p.z}`),
          pz: posts.has(`${p.x},${p.z + 1}`), nz: posts.has(`${p.x},${p.z - 1}`),
        });
        mesh.position.copy(at); mesh.position.y -= 0.03; scene.add(mesh); break;
      }
      case 'torch': case 'shrine': {
        const kind = p.type === 'torch' ? 'torch' : p.shrine;
        if (kind) {
          const shrine = new Shrine(scene, at, kind, lights);
          shrine.group.rotation.y = rot;
          animated.push(shrine);
        }
        break;
      }
      case 'crop': if (p.crop) {
        new Soil(scene, at);
        const spec = CROP_SPECS[p.crop];
        new Crop(scene, spec, at, spec.sproutSeconds + spec.immatureSeconds);
      } break;
    }
  }
  return animated;
}
