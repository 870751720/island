import * as THREE from 'three';
import { Soil } from '../entities/Soil';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { FacilityDef } from './Facilities';
import type { SoilSystem } from './SoilSystem';
import { hoePlaceTime } from './ToolTiers';

/** 预览按目标格和邻接变化更新，与实际开垦使用相同贴地模型。 */
export function soilFacility(system: SoilSystem, terrain: IslandTerrain): FacilityDef {
  const models = new WeakMap<THREE.Object3D, { soil: Soil; stamp: string }>();
  return {
    tool: 'hoe', free: true, name: '土壤', placingLabel: '锄地开垦…',
    valid: (actor, x, z) => system.canPlaceAt(actor, x, z),
    buildPreview: () => {
      const scene = new THREE.Scene();
      const soil = new Soil(scene, new THREE.Vector3());
      scene.remove(soil.group);
      models.set(soil.group, { soil, stamp: '' });
      return soil.group;
    },
    onPreview: (preview, _actor, x, z) => {
      const entry = models.get(preview.children[0]);
      if (!entry) return;
      preview.rotation.y = 0;
      preview.position.set(0, 0, 0);
      const stamp = `${x},${z},${system.neighborMask(x, z)}`;
      if (entry.stamp === stamp) return;
      entry.stamp = stamp;
      entry.soil.group.position.set(x, terrain.getHeight(x, z), z);
      entry.soil.fit(terrain, system.neighbors(x, z));
    },
    place: (actor, at) => system.place(actor, at),
    holdTime: (actor) => hoePlaceTime(actor.tools.hoe),
    failText: () => '这里锄不了,找块没东西的干地试试',
  };
}
