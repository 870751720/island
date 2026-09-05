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
  /** 岛屿世界尺寸(正方形边长,世界原点在中心) */
  islandSize: number;
  player: { x: number; z: number };
  /** 其他联机玩家落点(房主与客人各自从本地会话镜像取) */
  others: { x: number; z: number; name: string }[];
  markers: MinimapMarker[];
  /** 探索网格(按行展开,边长 gridLen) */
  explored: Uint8Array;
  gridLen: number;
};

/** 探索半径(米):玩家周围多大范围被点亮 */
const REVEAL_RADIUS = 24;

export class MinimapSystem {
  readonly gridLen: number;
  private readonly cell: number;
  private readonly explored: Uint8Array;

  constructor(islandSize: number) {
    // 2 米一格:160 米的岛是 80×80,粒度足够描绘海岸线
    this.gridLen = Math.ceil(islandSize / 2);
    this.cell = islandSize / this.gridLen;
    this.explored = new Uint8Array(this.gridLen * this.gridLen);
  }

  /** 玩家走动时点亮周围格子 */
  update(x: number, z: number): void {
    const half = this.gridLen * this.cell / 2;
    const r = Math.ceil(REVEAL_RADIUS / this.cell);
    const cx = Math.floor((x + half) / this.cell);
    const cz = Math.floor((z + half) / this.cell);
    for (let dz = -r; dz <= r; dz++) {
      const gz = cz + dz;
      if (gz < 0 || gz >= this.gridLen) continue;
      for (let dx = -r; dx <= r; dx++) {
        const gx = cx + dx;
        if (gx < 0 || gx >= this.gridLen) continue;
        if (dx * dx + dz * dz > r * r) continue;
        this.explored[gz * this.gridLen + gx] = 1;
      }
    }
  }

  /** 探索网格(按行展开,边长 gridLen;1 = 已探索) */
  get grid(): Uint8Array {
    return this.explored;
  }

  /** 某个世界坐标是否已被探索(小地图标记只在已探索区域显示) */
  isExplored(x: number, z: number): boolean {
    const half = this.gridLen * this.cell / 2;
    const gx = Math.floor((x + half) / this.cell);
    const gz = Math.floor((z + half) / this.cell);
    if (gx < 0 || gz < 0 || gx >= this.gridLen || gz >= this.gridLen) return false;
    return this.explored[gz * this.gridLen + gx] === 1;
  }

  serialize(): number[] {
    return Array.from(this.explored);
  }

  restore(data: number[]): void {
    if (data.length !== this.explored.length) return;
    this.explored.set(data);
  }
}
