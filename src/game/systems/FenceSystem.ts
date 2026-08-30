import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { ObstacleSolver } from '../entities/Player';
import { Fence, type FenceConnections, type FenceKind } from '../entities/Fence';
import { FenceGate } from '../entities/FenceGate';
import type { Inventory, ResourceKind } from './Inventory';
import type { Tools } from './Crafting';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';

/** 围栏网格边长:围栏柱吸附在整数格点上,相邻柱间距 1 */
const FENCE_GRID = 1;
/** 玩家面前放置围栏的距离(放置点再吸附到最近格点) */
const PLACE_AHEAD = 0.9;
/** 围栏落点离资源点的最小距离 */
const PROP_BLOCK_RANGE = 0.6;
/** 门自动开合的玩家距离 */
const GATE_AUTO_RANGE = 1.25;
/** 持锄头可开挖围栏的距离 */
const DIG_RANGE = 1.5;
/** 锄头挖围栏的命中次数(精致锄 1 次) */
const DIG_HITS = 2;
const SWING_TIME = 0.6;

/** 阻挡线段:XZ 平面上的有向线段(闭合围栏连接与关着的门) */
type Segment = { ax: number; az: number; bx: number; bz: number };

/** 围栏物品 → 场上围栏种类 */
export function fenceKindOfItem(kind: ResourceKind): FenceKind | null {
  if (kind === 'fenceWood') return 'wood';
  if (kind === 'fenceStone') return 'stone';
  return null;
}

/**
 * 围栏系统:
 * - 围栏柱吸附在整数格点上,相邻柱/门之间自动伸出横杆,沿边逐个放置即可围出无缝闭合的圈;
 * - 围栏门占一条格点边,玩家靠近自动开、走远自动关,动物不会开门;
 * - 围栏连接与关着的门构成阻挡线段:玩家移动被推出,动物(兔/羊/鹿/熊/蟹)绕行判定被挡住;
 * - 手持锄头靠近站定自动把围栏/门挖回道具。
 */
export class FenceSystem implements ObstacleSolver {
  private fences = new Map<string, Fence>();
  private gates = new Map<string, FenceGate>();
  private segments: Segment[] = [];
  private swingTimer = 0;
  private hits = 0;
  private digTarget: { kind: 'fence' | 'gate'; key: string } | null = null;

  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private inventory: Inventory,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    private tools: Tools,
    /** 挖走围栏时道具入包(背包放不下的部分由该函数掉到地上) */
    private give: (kind: ResourceKind, count: number) => number,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isBusy: () => boolean = () => false
  ) {}

  // ---- 键与坐标 ----

  private static vertexKey(gx: number, gz: number): string {
    return `${gx}:${gz}`;
  }

  /** 边键:从格点 (gx,gz) 伸向 +x(dir='x')或 +z(dir='z')的那条边 */
  private static edgeKey(gx: number, gz: number, dir: 'x' | 'z'): string {
    return `${dir}:${gx}:${gz}`;
  }

  /** 玩家面前的目标点(世界坐标) */
  private aheadPoint(): { x: number; z: number } {
    const p = this.player.group.position;
    const rot = this.player.group.rotation.y;
    return {
      x: p.x + Math.sin(rot) * PLACE_AHEAD,
      z: p.z + Math.cos(rot) * PLACE_AHEAD,
    };
  }

  // ---- 连接与阻挡 ----

  /** 某条边上是否有门 */
  private gateAt(gx: number, gz: number, dir: 'x' | 'z'): boolean {
    return this.gates.has(FenceSystem.edgeKey(gx, gz, dir));
  }

  /** 围栏柱在四个方向上的连接(相邻柱或门) */
  private connectionsOf(gx: number, gz: number): FenceConnections {
    return {
      px: this.fences.has(FenceSystem.vertexKey(gx + 1, gz)) || this.gateAt(gx, gz, 'x'),
      nx: this.fences.has(FenceSystem.vertexKey(gx - 1, gz)) || this.gateAt(gx - 1, gz, 'x'),
      pz: this.fences.has(FenceSystem.vertexKey(gx, gz + 1)) || this.gateAt(gx, gz, 'z'),
      nz: this.fences.has(FenceSystem.vertexKey(gx, gz - 1)) || this.gateAt(gx, gz - 1, 'z'),
    };
  }

  /** 重算某柱及其可能受影响的四邻的连接网格 */
  private refreshAround(gx: number, gz: number): void {
    for (const [dx, dz] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const fence = this.fences.get(FenceSystem.vertexKey(gx + dx, gz + dz));
      if (fence) fence.rebuild(this.connectionsOf(fence.gx, fence.gz));
    }
  }

  /** 重算全部阻挡线段(围栏连接 + 关着的门) */
  private rebuildSegments(): void {
    const list: Segment[] = [];
    for (const fence of this.fences.values()) {
      const { gx, gz } = fence;
      if (this.fences.has(FenceSystem.vertexKey(gx + 1, gz))) {
        list.push({ ax: gx, az: gz, bx: gx + 1, bz: gz });
      }
      if (this.fences.has(FenceSystem.vertexKey(gx, gz + 1))) {
        list.push({ ax: gx, az: gz, bx: gx, bz: gz + 1 });
      }
    }
    for (const gate of this.gates.values()) {
      if (!gate.isOpen) {
        const mx = gate.gx + (gate.dir === 'x' ? 0.5 : 0);
        const mz = gate.gz + (gate.dir === 'z' ? 0.5 : 0);
        const dx = gate.dir === 'x' ? 0.45 : 0;
        const dz = gate.dir === 'z' ? 0.45 : 0;
        list.push({ ax: mx - dx, az: mz - dz, bx: mx + dx, bz: mz + dz });
      }
    }
    this.segments = list;
  }

  /** 点到线段的 XZ 距离平方 */
  private static distSqToSegment(x: number, z: number, s: Segment): number {
    const dx = s.bx - s.ax;
    const dz = s.bz - s.az;
    const lenSq = dx * dx + dz * dz || 1;
    const t = THREE.MathUtils.clamp(((x - s.ax) * dx + (z - s.az) * dz) / lenSq, 0, 1);
    const px = s.ax + dx * t;
    const pz = s.az + dz * t;
    return (x - px) ** 2 + (z - pz) ** 2;
  }

  /** 动物绕行判定:该点在任一阻挡线段的半径内即视为不可走 */
  isBlocked(x: number, z: number, radius = 0.3): boolean {
    const rSq = radius * radius;
    return this.segments.some((s) => FenceSystem.distSqToSegment(x, z, s) < rSq);
  }

  /** 玩家碰撞解算:被推出阻挡线段(围栏挡玩家) */
  resolveCollision(p: THREE.Vector3, radius: number): void {
    for (const s of this.segments) {
      const dx = s.bx - s.ax;
      const dz = s.bz - s.az;
      const lenSq = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((p.x - s.ax) * dx + (p.z - s.az) * dz) / lenSq, 0, 1);
      const cx = s.ax + dx * t;
      const cz = s.az + dz * t;
      const ox = p.x - cx;
      const oz = p.z - cz;
      const distSq = ox * ox + oz * oz;
      if (distSq >= radius * radius) continue;
      const dist = Math.sqrt(distSq);
      if (dist < 0.001) {
        // 正压在线段上:沿法线方向推出
        const inv = 1 / Math.sqrt(lenSq);
        p.x += -dz * inv * radius;
        p.z += dx * inv * radius;
      } else {
        const push = (radius - dist) / dist;
        p.x += ox * push;
        p.z += oz * push;
      }
    }
  }

  // ---- 放置 ----

  /** 背包里点击「使用」围栏:吸附到玩家面前最近的格点放下 */
  useFence(kind: FenceKind): boolean {
    const item: ResourceKind = kind === 'wood' ? 'fenceWood' : 'fenceStone';
    if (this.inventory.count(item) <= 0 || !this.canPlaceFence()) return false;
    const t = this.aheadPoint();
    const gx = Math.round(t.x / FENCE_GRID);
    const gz = Math.round(t.z / FENCE_GRID);
    this.inventory.remove(item, 1);
    const y = this.terrain.getHeight(gx, gz);
    this.fences.set(FenceSystem.vertexKey(gx, gz), new Fence(this.scene, gx, gz, kind, y));
    this.refreshAround(gx, gz);
    this.rebuildSegments();
    this.audio.play('success');
    const fxPos = new THREE.Vector3(gx, y + 0.5, gz);
    this.fx.burst(fxPos, kind === 'wood' ? '#a97b48' : '#9a9a9a', 10);
    return true;
  }

  /** 玩家面前的格点是否允许立围栏柱 */
  private canPlaceFence(): boolean {
    if (this.player.isSwimming) return false;
    const t = this.aheadPoint();
    const gx = Math.round(t.x / FENCE_GRID);
    const gz = Math.round(t.z / FENCE_GRID);
    if (this.fences.has(FenceSystem.vertexKey(gx, gz))) return false;
    const p = new THREE.Vector3(gx, 0, gz);
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(gx, gz) <= 0) return false;
    return !this.props.isOccupied(p, PROP_BLOCK_RANGE);
  }

  /** 背包里点击「使用」围栏门:吸附到玩家面前最近的格点边放下 */
  useGate(): boolean {
    if (this.inventory.count('fenceGate') <= 0 || !this.canPlaceGate()) return false;
    const edge = this.nearestEdge();
    if (!edge) return false;
    this.inventory.remove('fenceGate', 1);
    const { gx, gz, dir } = edge;
    const y = (this.terrain.getHeight(gx, gz) + this.terrain.getHeight(dir === 'x' ? gx + 1 : gx, dir === 'z' ? gz + 1 : gz)) / 2;
    this.gates.set(
      FenceSystem.edgeKey(gx, gz, dir),
      new FenceGate(this.scene, gx, gz, dir, y, gx + (dir === 'x' ? 0.5 : 0), gz + (dir === 'z' ? 0.5 : 0))
    );
    this.refreshAround(gx, gz);
    if (dir === 'x') this.refreshAround(gx + 1, gz);
    else this.refreshAround(gx, gz + 1);
    this.rebuildSegments();
    this.audio.play('success');
    this.fx.burst(new THREE.Vector3(gx + (dir === 'x' ? 0.5 : 0), y + 0.5, gz + (dir === 'z' ? 0.5 : 0)), '#8a6239', 10);
    return true;
  }

  /** 玩家面前最近的格点边(东西边或南北边中更近者),不可放时为 null */
  private nearestEdge(): { gx: number; gz: number; dir: 'x' | 'z' } | null {
    const t = this.aheadPoint();
    const ex = { gx: Math.round(t.x / FENCE_GRID - 0.5), gz: Math.round(t.z / FENCE_GRID), dir: 'x' as const };
    const ez = { gx: Math.round(t.x / FENCE_GRID), gz: Math.round(t.z / FENCE_GRID - 0.5), dir: 'z' as const };
    const dx = (ex.gx + 0.5 - t.x) ** 2 + (ex.gz - t.z) ** 2;
    const dz = (ez.gx - t.x) ** 2 + (ez.gz + 0.5 - t.z) ** 2;
    return dx <= dz ? ex : ez;
  }

  /** 玩家面前的边是否允许放门 */
  private canPlaceGate(): boolean {
    if (this.player.isSwimming) return false;
    const edge = this.nearestEdge();
    if (!edge) return false;
    const { gx, gz, dir } = edge;
    if (this.gates.has(FenceSystem.edgeKey(gx, gz, dir))) return false;
    // 该边已被围栏横杆占据(两端都有柱)时不能再放门
    const ax = dir === 'x' ? gx + 1 : gx;
    const az = dir === 'z' ? gz + 1 : gz;
    if (this.fences.has(FenceSystem.vertexKey(gx, gz)) && this.fences.has(FenceSystem.vertexKey(ax, az))) {
      return false;
    }
    for (const [cx, cz] of [
      [gx, gz],
      [ax, az],
    ]) {
      const p = new THREE.Vector3(cx, 0, cz);
      if (this.terrain.isNearWater(p, 1)) return false;
      if (this.terrain.getHeight(cx, cz) <= 0) return false;
      if (this.props.isOccupied(p, PROP_BLOCK_RANGE)) return false;
    }
    return true;
  }

  // ---- 挖除 ----

  /** 正在挖围栏/门 */
  get isDigging(): boolean {
    return !!this.digTarget;
  }

  /** 每帧:门自动开合 + 持锄头站定自动挖围栏/门(变回道具) */
  update(delta: number): void {
    const p = this.player.group.position;
    for (const gate of this.gates.values()) {
      const mx = gate.gx + (gate.dir === 'x' ? 0.5 : 0);
      const mz = gate.gz + (gate.dir === 'z' ? 0.5 : 0);
      gate.setPlayerNear(Math.hypot(p.x - mx, p.z - mz) < GATE_AUTO_RANGE);
      gate.update(delta);
    }
    // 门开合会改变阻挡,统一在帧末重算
    if (this.gates.size > 0) this.rebuildSegments();

    const holding = this.player.currentTool === 'hoe';
    let target: { kind: 'fence' | 'gate'; key: string } | null = null;
    if (holding && !this.player.isSwimming && !this.isBusy()) {
      target = this.findDigTarget();
    }
    if (!target || this.player.isMoving) {
      this.digTarget = null;
      this.swingTimer = 0;
      this.hits = 0;
      return;
    }
    this.digTarget = target;
    this.player.setAction('mine');
    this.swingTimer += delta;
    if (this.swingTimer < SWING_TIME) return;
    this.swingTimer = 0;
    this.hits += 1;
    this.fx.burst(this.digCenter(target), '#a97b48', 6);
    if (this.hits < (this.tools.hoe >= 2 ? 1 : DIG_HITS)) return;
    this.hits = 0;
    this.digTarget = null;
    const center = this.digCenter(target);
    this.removeByKey(target.kind, target.key);
    this.audio.play('pickup');
    this.fx.burst(center, '#a97b48', 14);
  }

  /** 挖掘目标的世界中心点 */
  private digCenter(target: { kind: 'fence' | 'gate'; key: string }): THREE.Vector3 {
    if (target.kind === 'fence') {
      const fence = this.fences.get(target.key)!;
      return new THREE.Vector3(fence.gx, this.terrain.getHeight(fence.gx, fence.gz) + 0.4, fence.gz);
    }
    const gate = this.gates.get(target.key)!;
    const mx = gate.gx + (gate.dir === 'x' ? 0.5 : 0);
    const mz = gate.gz + (gate.dir === 'z' ? 0.5 : 0);
    return new THREE.Vector3(mx, this.terrain.getHeight(mx, mz) + 0.4, mz);
  }

  /** 锄头范围内最近的围栏柱或门 */
  private findDigTarget(): { kind: 'fence' | 'gate'; key: string } | null {
    const p = this.player.group.position;
    let best: { kind: 'fence' | 'gate'; key: string } | null = null;
    let bestDist = DIG_RANGE * DIG_RANGE;
    for (const [key, fence] of this.fences) {
      const d = (fence.gx - p.x) ** 2 + (fence.gz - p.z) ** 2;
      if (d < bestDist) {
        best = { kind: 'fence', key };
        bestDist = d;
      }
    }
    for (const [key, gate] of this.gates) {
      const mx = gate.gx + (gate.dir === 'x' ? 0.5 : 0);
      const mz = gate.gz + (gate.dir === 'z' ? 0.5 : 0);
      const d = (mx - p.x) ** 2 + (mz - p.z) ** 2;
      if (d < bestDist) {
        best = { kind: 'gate', key };
        bestDist = d;
      }
    }
    return best;
  }

  /** 挖走围栏/门:变回道具入包并刷新周围连接 */
  private removeByKey(kind: 'fence' | 'gate', key: string): void {
    let gx: number;
    let gz: number;
    if (kind === 'fence') {
      const fence = this.fences.get(key)!;
      gx = fence.gx;
      gz = fence.gz;
      fence.remove(this.scene);
      this.fences.delete(key);
      this.give(fence.kind === 'wood' ? 'fenceWood' : 'fenceStone', 1);
    } else {
      const gate = this.gates.get(key)!;
      gx = gate.gx;
      gz = gate.gz;
      const ax = gate.dir === 'x' ? gx + 1 : gx;
      const az = gate.dir === 'z' ? gz + 1 : gz;
      gate.remove(this.scene);
      this.gates.delete(key);
      this.refreshAround(ax, az);
      this.give('fenceGate', 1);
    }
    this.refreshAround(gx, gz);
    this.rebuildSegments();
  }

  /** 当前挖掘进度 0-1,未在挖掘时为 null */
  getDigProgress(): number | null {
    if (!this.digTarget) return null;
    const need = this.tools.hoe >= 2 ? 1 : DIG_HITS;
    return Math.min((this.hits + this.swingTimer / SWING_TIME) / need, 1);
  }

  // ---- 存档 ----

  /** 所有围栏柱的存档快照(格点坐标与种类) */
  snapshotFences(): { x: number; z: number; kind: FenceKind }[] {
    return [...this.fences.values()].map((f) => ({ x: f.gx, z: f.gz, kind: f.kind }));
  }

  /** 所有门的存档快照(边起点格点与方向) */
  snapshotGates(): { x: number; z: number; dir: 'x' | 'z' }[] {
    return [...this.gates.values()].map((g) => ({ x: g.gx, z: g.gz, dir: g.dir }));
  }

  /** 从存档恢复围栏与门(连接与阻挡统一重建) */
  restore(
    fences: { x: number; z: number; kind: FenceKind }[],
    gates: { x: number; z: number; dir: 'x' | 'z' }[]
  ): void {
    for (const f of fences) {
      if (this.fences.has(FenceSystem.vertexKey(f.x, f.z))) continue;
      this.fences.set(
        FenceSystem.vertexKey(f.x, f.z),
        new Fence(this.scene, f.x, f.z, f.kind, this.terrain.getHeight(f.x, f.z))
      );
    }
    for (const g of gates) {
      const key = FenceSystem.edgeKey(g.x, g.z, g.dir);
      if (this.gates.has(key)) continue;
      const ax = g.dir === 'x' ? g.x + 1 : g.x;
      const az = g.dir === 'z' ? g.z + 1 : g.z;
      const y = (this.terrain.getHeight(g.x, g.z) + this.terrain.getHeight(ax, az)) / 2;
      this.gates.set(
        key,
        new FenceGate(this.scene, g.x, g.z, g.dir, y, g.x + (g.dir === 'x' ? 0.5 : 0), g.z + (g.dir === 'z' ? 0.5 : 0))
      );
    }
    for (const fence of this.fences.values()) {
      fence.rebuild(this.connectionsOf(fence.gx, fence.gz));
    }
    this.rebuildSegments();
  }
}
