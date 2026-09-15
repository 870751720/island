import type * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';

export type RoadKind = 'gravelPath' | 'plankPath';
export type RoadSave = { id?: string; x: number; y: number; z: number };
export type RoadNeighbors = (dx: number, dz: number) => boolean;

export interface RoadModel {
  readonly group: THREE.Group;
  fit(terrain: IslandTerrain, neighbors: RoadNeighbors): void;
  remove(scene: THREE.Scene): void;
}
