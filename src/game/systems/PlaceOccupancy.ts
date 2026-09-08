import * as THREE from 'three';

/** 统一安放占格判定的参与方:每个放置系统实现后注册进共享服务 */
export interface CellOccupant {
  /** 该点 1 米(同一吸附格)内是否有本系统已放置的实体,按水平距离判定 */
  blocksCell(p: THREE.Vector3): boolean;
}

/** 全场已放置实体的占格查询:所有安放系统共用,同格已被任何实体占据即不可再放 */
export class PlaceOccupancy {
  private occupants: CellOccupant[] = [];

  register(occupant: CellOccupant): void {
    this.occupants.push(occupant);
  }

  taken(p: THREE.Vector3): boolean {
    return this.occupants.some((o) => o.blocksCell(p));
  }
}
