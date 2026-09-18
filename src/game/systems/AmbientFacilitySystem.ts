import * as THREE from 'three';
import { Shrine, SHRINE_COLORS, type ShrineKind } from '../entities/Shrine';
import { Torch, TORCH_COLOR } from '../entities/Torch';
import { FacilitySystem, type FacilityDependencies, type FacilitySave } from './FacilitySystem';
import { ShrineEffects } from './ShrineEffects';
import type { LightPool } from '../world/LightPool';

export type AmbientFacilityKind = ShrineKind | 'torch';
export type AmbientFacilitySave = FacilitySave<AmbientFacilityKind>;

export function createAmbientFacility(scene: THREE.Scene, position: THREE.Vector3, kind: AmbientFacilityKind, lights?: LightPool) {
  return kind === 'torch' ? new Torch(scene, position, lights) : new Shrine(scene, position, kind);
}

/** 无面板的常驻设施；照明与祝福分别由火把实体、神龛效果组件负责。 */
export class AmbientFacilitySystem extends FacilitySystem<AmbientFacilityKind> {
  readonly blessings = new ShrineEffects(() => this.facilities);

  constructor(dependencies: FacilityDependencies, lights?: LightPool) {
    super(dependencies, {
      create: (world, position, kind) => createAmbientFacility(world, position, kind, lights),
      color: (kind) => kind === 'torch' ? TORCH_COLOR : SHRINE_COLORS[kind],
    }, 'shrine'); // 保留存档与联机实体 ID 前缀。
  }
}
