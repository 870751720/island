/**
 * 小地图系统:维护「战争迷雾」探索网格。
 * 岛屿按 cell 尺寸切成方格,玩家走过的周围一圈标记为已探索;
 * 未探索的格子在小地图上被遮住(地形与标记都不可见)。
 * 迷雾随存档持久化(网格按行展开为 0/1 数组)。
 */
export type MinimapMarkerKind = 'workbench' | 'campfire' | 'bed';

/** 小地图标记(工作台/火堆/床的落点) */
export type MinimapMarker = { kind: MinimapMarkerKind; x: number; z: number };

/** 小地图地面采样结果(用于绘制底图颜色) */
export type GroundKind = 'water' | 'sand' | 'grass' | 'dark';

/** 每帧供小地图渲染的快照 */
export type MinimapSnapshot = {
  /** 岛屿世界尺寸(世界原点在中心):东西向宽度与南北向长度 */
  islandWidth: number;
  islandLength: number;
  player: { x: number; z: number };
  /** 其他联机玩家落点(房主与客人各自从本地会话镜像取) */
  others: { x: number; z: number; name: string }[];
  markers: MinimapMarker[];
  /** 探索网格(按行展开,每行 gridW 格,共 gridL 行) */
  explored: Uint8Array;
  gridW: number;
  gridL: number;
};

/** 探索半径(米):玩家周围多大范围被点亮 */
const REVEAL_RADIUS = 24;
/** 一格的边长(米) */
export const CELL = 2;

export class MinimapSystem {
  readonly gridW: number;
  readonly gridL: number;
  private readonly explored: Uint8Array;

  constructor(islandWidth: number, islandLength: number) {
    this.gridW = Math.ceil(islandWidth / CELL);
    this.gridL = Math.ceil(islandLength / CELL);
    this.explored = new Uint8Array(this.gridW * this.gridL);
  }

  /** 玩家走动时点亮周围格子 */
  update(x: number, z: number): void {
    const hw = (this.gridW * CELL) / 2;
    const hl = (this.gridL * CELL) / 2;
    const r = Math.ceil(REVEAL_RADIUS / CELL);
    const cx = Math.floor((x + hw) / CELL);
    const cz = Math.floor((z + hl) / CELL);
    for (let dz = -r; dz <= r; dz++) {
      const gz = cz + dz;
      if (gz < 0 || gz >= this.gridL) continue;
      for (let dx = -r; dx <= r; dx++) {
        const gx = cx + dx;
        if (gx < 0 || gx >= this.gridW) continue;
        if (dx * dx + dz * dz > r * r) continue;
        this.explored[gz * this.gridW + gx] = 1;
      }
    }
  }

  /** 探索网格(按行展开;1 = 已探索) */
  get grid(): Uint8Array {
    return this.explored;
  }

  /** 某个世界坐标是否已被探索(小地图标记只在已探索区域显示) */
  isExplored(x: number, z: number): boolean {
    const hw = (this.gridW * CELL) / 2;
    const hl = (this.gridL * CELL) / 2;
    const gx = Math.floor((x + hw) / CELL);
    const gz = Math.floor((z + hl) / CELL);
    if (gx < 0 || gz < 0 || gx >= this.gridW || gz >= this.gridL) return false;
    return this.explored[gz * this.gridW + gx] === 1;
  }

  serialize(): number[] {
    return Array.from(this.explored);
  }

  restore(data: number[]): void {
    if (data.length !== this.explored.length) return;
    this.explored.set(data);
  }
}
