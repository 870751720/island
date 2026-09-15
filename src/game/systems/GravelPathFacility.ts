import * as THREE from 'three';
import { GravelPath } from '../entities/GravelPath';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { FacilityDef } from './Facilities';
import type { GravelPathSystem } from './GravelPathSystem';

/** 路面预览随落格贴地，手持缩略模型仍使用平面造型。 */
export function gravelPathFacility(system: GravelPathSystem, terrain: IslandTerrain): FacilityDef {
  const models = new WeakMap<THREE.Object3D, { path: GravelPath; stamp: string }>();
  const build = () => {
    const scene = new THREE.Scene();
    const path = new GravelPath(scene, new THREE.Vector3());
    scene.remove(path.group);
    models.set(path.group, { path, stamp: '' });
    return path.group;
  };
  return {
    tool: 'place',
    valid: (actor, x, z) => system.canPlaceAt(actor, x, z),
    buildPreview: build,
    handModel: build,
    onPreview: (preview, _actor, x, z) => {
      const entry = models.get(preview.children[0]);
      if (!entry) return;
      const mask = system.neighborMask(x, z);
      const stamp = `${x},${z},${mask}`;
      preview.rotation.y = 0;
      // 顶点已按世界落点构建，抵消统一预览的向下偏移。
      preview.position.set(0, 0, 0);
      if (entry.stamp === stamp) return;
      entry.stamp = stamp;
      entry.path.group.position.set(x, terrain.getHeight(x, z), z);
      entry.path.fit(terrain, system.neighbors(x, z));
    },
    place: (actor, at) => system.place(actor, at),
  };
}
