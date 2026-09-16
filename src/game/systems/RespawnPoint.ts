import * as THREE from 'three';

export interface RespawnFacility {
  id: string;
  x: number;
  z: number;
}

/** 按设施优先级寻找邻近空地；天然地点设施不作为玩家营地。 */
export function findRespawnPoint(
  origin: THREE.Vector3,
  groups: readonly (readonly RespawnFacility[])[],
  height: (x: number, z: number) => number,
  canStand: (point: THREE.Vector3) => boolean,
  fallback: () => THREE.Vector3,
): THREE.Vector3 {
  for (const facilities of groups) {
    const candidates = facilities.filter(f => !f.id.startsWith('landmark_'));
    const distance = (f: RespawnFacility) => (f.x - origin.x) ** 2 + (f.z - origin.z) ** 2;
    candidates.sort((a, b) => distance(a) - distance(b) || a.id.localeCompare(b.id));
    for (const facility of candidates) {
      for (const radius of [1.5, 2, 2.5, 3]) {
        for (let i = 0; i < 16; i++) {
          const angle = i * Math.PI / 8;
          const x = facility.x + Math.sin(angle) * radius;
          const z = facility.z + Math.cos(angle) * radius;
          const point = new THREE.Vector3(x, height(x, z), z);
          if (canStand(point)) return point;
        }
      }
    }
  }
  return fallback();
}
