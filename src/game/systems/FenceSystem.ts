import * as THREE from 'three';
import { shovelHits } from './ToolTiers';
import type { ObstacleSolver } from '../entities/Player';
import { Fence, type FenceConnections, type FenceKind } from '../entities/Fence';
import { PREVIEW_OK, previewGhostMaterial } from './Facilities';
import { FenceGate } from '../entities/FenceGate';
import type { ResourceKind } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import { ActionHold } from './ActionHold';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';

/** 围栏网格边长:围栏柱吸附在整数格点上,相邻柱间距 1 */
const FENCE_GRID = 1;
/** 玩家面前放置围栏的距离(放置点再吸附到最近格点) */
const PLACE_AHEAD = 0.9;
/** 围栏落点离资源点的最小距离 */
const PROP_BLOCK_RANGE = 0.6;
/** 门自动开合的玩家距离 */
const GATE_AUTO_RANGE = 1.6;
/** 持铲子可开挖围栏的距离 */
const DIG_RANGE = 1.5;
/** 铲子挖围栏的命中次数(二级铲 1 次) */
const SWING_TIME = 0.6;

/** 幽灵预览连接判定的空虚拟集(无预览虚拟物时) */
const NO_VIRTUAL: ReadonlySet<string> = new Set();

/** 阻挡线段:XZ 平面上的有向线段(闭合围栏连接与关着的门) */
type Segment = { ax: number; az: number; bx: number; bz: number };

/** 幽灵预览里命名横杆(rail-px/nx/pz/nz)的集合 */
function ghostRailsOf(preview: THREE.Object3D): THREE.Object3D[] {
  const rails: THREE.Object3D[] = [];
  preview.traverse((o) => {
    if (o.name.startsWith('rail-')) rails.push(o);
  });
  return rails;
}

/** 每玩家的挖掘进度(围栏与门本身是世界共享的) */
type PlayerSessionState = {
  hold: ActionHold;
  swingTimer: number;
  hits: number;
  digTarget: { kind: 'fence' | 'gate'; key: string } | null;
};

/** 手持迷你围栏(真材质,外层再整体缩放到手心大小) */
export function makeFenceHandModel(kind: FenceKind): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: kind === 'branch' ? '#a97b48' : '#9a9a9a', flatShading: true, roughness: 1 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1, 6), mat);
  post.position.y = 0.5;
  g.add(post);
  for (const y of [0.35, 0.7]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.06), mat);
    rail.position.y = y;
    g.add(rail);
  }
  return g;
}

/** 手持迷你围栏门(真材质,外层再整体缩放到手心大小) */
export function makeFenceGateHandModel(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#8a6239', flatShading: true, roughness: 1 });
  for (const x of [-0.95, 0.95]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1, 6), mat);
    post.position.set(x, 0.47, 0);
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.08), mat);
  beam.position.y = 0.95;
  g.add(beam);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 0.05), mat);
  leaf.position.set(0, 0.45, 0);
  g.add(leaf);
  return g;
}

/** 围栏幽灵预览的建模:与实物同款几何(区分木/石),横杆命名 rail-px/nx/pz/nz 由安放系统按邻居显隐 */
export { makeFencePreview as makeFenceGhost } from '../entities/Fence';

/** 围栏门幽灵预览的建模(朝向由安放系统按目标门带方向设置) */
export function makeGateGhost(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1 });
  for (const x of [-0.92, 0.92]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.95, 6), mat);
    post.position.set(x, 0.47, 0);
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.07, 0.07), mat);
  beam.position.y = 0.92;
  g.add(beam);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 0.05), mat);
  leaf.position.set(0, 0.45, 0);
  g.add(leaf);
  return g;
}

/**
 * 围栏系统(世界单实例):围栏世界状态与放置/挖除结算——
 * - 围栏柱吸附在整数格点上,相邻柱/门之间自动伸出横杆,沿边逐个放置即可围出无缝闭合的圈;
 * - 围栏门占一条格点边,玩家靠近自动开、走远自动关,动物不会开门;
 * - 围栏连接与关着的门构成阻挡线段:玩家移动被推出,动物(兔/羊/野牛/狼/熊/蟹)绕行判定被挡住;
 * - 手持铲子靠近站定自动把围栏/门挖回道具。
 * 手持放置的落点选择/预览/站定自动放置统一走 AutoPlaceSystem,经 FacilityDef 委托到本系统。
 */
export class FenceSystem implements ObstacleSolver {
  private fences = new Map<string, Fence>();
  private gates = new Map<string, FenceGate>();
  private segments: Segment[] = [];
  private states = new Map<PlayerSession, PlayerSessionState>();
  private fenceIds = new WorldEntityIds<Fence>('fence');
  private gateIds = new WorldEntityIds<FenceGate>('gate');
  private onFenceChanged?: EntityChangeSink;
  private onGateChanged?: EntityChangeSink;

  setChangeSinks(fences?: EntityChangeSink, gates?: EntityChangeSink): void {
    this.onFenceChanged = fences;
    this.onGateChanged = gates;
  }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 挖走围栏时道具入包(背包放不下的部分由该函数掉到地上) */
    private give: (kind: ResourceKind, count: number, actor: PlayerSession) => number,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isBusy: (actor: PlayerSession) => boolean = () => false
  ) {}

  private st(actor: PlayerSession): PlayerSessionState {
    let st = this.states.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), swingTimer: 0, hits: 0, digTarget: null };
      this.states.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人进度 */
  detach(actor: PlayerSession): void {
    this.states.delete(actor);
  }

  // ---- 键与坐标 ----

  private static vertexKey(gx: number, gz: number): string {
    return `${gx}:${gz}`;
  }

  /** 边键:从格点 (gx,gz) 伸向 +x(dir='x')或 +z(dir='z')的那条边 */
  private static edgeKey(gx: number, gz: number, dir: 'x' | 'z'): string {
    return `${dir}:${gx}:${gz}`;
  }

  /** 玩家面前的目标点(世界坐标) */
  private aheadPoint(actor: PlayerSession): { x: number; z: number } {
    const p = actor.player.group.position;
    const rot = actor.player.group.rotation.y;
    return {
      x: p.x + Math.sin(rot) * PLACE_AHEAD,
      z: p.z + Math.cos(rot) * PLACE_AHEAD,
    };
  }

  // ---- 连接与阻挡 ----

  /** 某条单位边是否被门占据(门跨两格,可能从这条边或前一条边起);仅用于门落位查重,门不与围栏连杆 */
  private gateAt(gx: number, gz: number, dir: 'x' | 'z'): boolean {
    const backX = dir === 'x' ? gx - 1 : gx;
    const backZ = dir === 'z' ? gz - 1 : gz;
    return (
      this.gates.has(FenceSystem.edgeKey(gx, gz, dir)) ||
      this.gates.has(FenceSystem.edgeKey(backX, backZ, dir))
    );
  }

  /** 该格点是否有连接柱:真实围栏、门带两端的门框立柱(门扇中间不算)或幽灵预览柱 */
  private hasPostAt(x: number, z: number, virtualFences: ReadonlySet<string>): boolean {
    if (this.fences.has(FenceSystem.vertexKey(x, z)) || virtualFences.has(FenceSystem.vertexKey(x, z))) return true;
    for (const gate of this.gates.values()) {
      if ((x === gate.gx && z === gate.gz) || (x === gate.endX && z === gate.endZ)) return true;
    }
    return false;
  }

  /** 围栏柱在四个方向上的连接(相邻柱或门带两端的门框立柱),virtualFences 为幽灵预览柱占的格点键 */
  private connsWith(gx: number, gz: number, virtualFences: ReadonlySet<string> = NO_VIRTUAL): FenceConnections {
    return {
      px: this.hasPostAt(gx + 1, gz, virtualFences),
      nx: this.hasPostAt(gx - 1, gz, virtualFences),
      pz: this.hasPostAt(gx, gz + 1, virtualFences),
      nz: this.hasPostAt(gx, gz - 1, virtualFences),
    };
  }

  private connectionsOf(gx: number, gz: number): FenceConnections {
    return this.connsWith(gx, gz);
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
        // 两格宽的门带:整条从起点柱到终点柱都是阻挡
        list.push({ ax: gate.gx, az: gate.gz, bx: gate.endX, bz: gate.endZ });
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

  /** 背包里点击「使用」围栏:按「就近连接优先」吸附放下 */
  useFence(actor: PlayerSession, kind: FenceKind): boolean {
    const item: ResourceKind = kind === 'branch' ? 'fenceWood' : 'fenceStone';
    const target = this.vertexTarget(actor);
    if (actor.inventory.count(item) <= 0 || !target) return false;
    const { gx, gz } = target;
    actor.inventory.remove(item, 1);
    const y = this.terrain.getHeight(gx, gz);
    const fence = new Fence(this.scene, gx, gz, kind, y);
    this.fences.set(FenceSystem.vertexKey(gx, gz), fence);
    this.onFenceChanged?.({ op: 'add', id: this.fenceIds.get(fence), value: { id: this.fenceIds.get(fence), x: gx, z: gz, kind } });
    this.refreshAround(gx, gz);
    this.rebuildSegments();
    this.audio.play('success');
    const fxPos = new THREE.Vector3(gx, y + 0.5, gz);
    this.fx.burst(fxPos, kind === 'branch' ? '#a97b48' : '#9a9a9a', 10);
    return true;
  }

  /** 该格点是否落在某条门带内(门框立柱与门扇占的三个顶点,不能立围栏柱) */
  private gateCovers(gx: number, gz: number): boolean {
    for (const gate of this.gates.values()) {
      const minX = Math.min(gate.gx, gate.endX);
      const maxX = Math.max(gate.gx, gate.endX);
      const minZ = Math.min(gate.gz, gate.endZ);
      const maxZ = Math.max(gate.gz, gate.endZ);
      if (gx >= minX && gx <= maxX && gz >= minZ && gz <= maxZ) return true;
    }
    return false;
  }

  /** 某格点是否允许立围栏柱(空、不在门带内、干地、不被资源点占住) */
  private vertexValid(gx: number, gz: number): boolean {
    if (this.fences.has(FenceSystem.vertexKey(gx, gz))) return false;
    if (this.gateCovers(gx, gz)) return false;
    const p = new THREE.Vector3(gx, 0, gz);
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(gx, gz) <= 0) return false;
    return !this.props.isOccupied(p, PROP_BLOCK_RANGE);
  }

  /**
   * 手持围栏时的最佳落点:面前附近一圈格点里打分——
   * 能与现有围栏/门相连的格点优先(接上玩家身边的围栏线),否则取离面前最近的。
   */
  vertexTarget(actor: PlayerSession): { gx: number; gz: number } | null {
    const t = this.aheadPoint(actor);
    const bx = Math.round(t.x / FENCE_GRID);
    const bz = Math.round(t.z / FENCE_GRID);
    let best: { gx: number; gz: number } | null = null;
    let bestScore = Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const gx = bx + dx;
        const gz = bz + dz;
        const dist = Math.hypot(gx - t.x, gz - t.z);
        if (dist > 1.15 || !this.vertexValid(gx, gz)) continue;
        const conns = this.connectionsOf(gx, gz);
        const adjacent = conns.px || conns.nx || conns.pz || conns.nz;
        const score = (adjacent ? 0 : 10) + dist;
        if (score < bestScore) {
          bestScore = score;
          best = { gx, gz };
        }
      }
    }
    return best;
  }

  /** 背包里点击「使用」围栏门:按「就近连接优先」吸附放下(门跨两格,双扇对开) */
  useGate(actor: PlayerSession): boolean {
    const target = this.gateTarget(actor);
    if (actor.inventory.count('fenceGate') <= 0 || !target) return false;
    const { gx, gz, dir } = target;
    actor.inventory.remove('fenceGate', 1);
    const gate = new FenceGate(
      this.scene,
      gx,
      gz,
      dir,
      (this.terrain.getHeight(gx, gz) + this.terrain.getHeight(gx + (dir === 'x' ? 2 : 0), gz + (dir === 'z' ? 2 : 0))) / 2
    );
    this.gates.set(FenceSystem.edgeKey(gx, gz, dir), gate);
    this.onGateChanged?.({ op: 'add', id: this.gateIds.get(gate), value: { id: this.gateIds.get(gate), x: gx, z: gz, dir } });
    this.refreshAround(gx, gz);
    this.refreshAround(gate.endX, gate.endZ);
    this.rebuildSegments();
    this.audio.play('success');
    this.fx.burst(new THREE.Vector3(gate.centerX, this.terrain.getHeight(gate.centerX, gate.centerZ) + 0.5, gate.centerZ), '#8a6239', 12);
    return true;
  }

  /** 某条两格门带是否允许放门(不与现有门/中间柱重叠,两端是可站立的干地) */
  private edgeValid(gx: number, gz: number, dir: 'x' | 'z'): boolean {
    // 门带覆盖的两条单位边都不能已被别的门占据
    if (this.gateAt(gx, gz, dir) || this.gateAt(dir === 'x' ? gx + 1 : gx, dir === 'z' ? gz + 1 : gz, dir)) {
      return false;
    }
    // 中间格点不能有围栏柱(会立在门框里)
    const mx = dir === 'x' ? gx + 1 : gx;
    const mz = dir === 'z' ? gz + 1 : gz;
    if (this.fences.has(FenceSystem.vertexKey(mx, mz))) return false;
    const ex = dir === 'x' ? gx + 2 : gx;
    const ez = dir === 'z' ? gz + 2 : gz;
    for (const [cx, cz] of [
      [gx, gz],
      [ex, ez],
    ]) {
      const p = new THREE.Vector3(cx, 0, cz);
      if (this.terrain.isNearWater(p, 1)) return false;
      if (this.terrain.getHeight(cx, cz) <= 0) return false;
      if (this.props.isOccupied(p, PROP_BLOCK_RANGE)) return false;
    }
    return true;
  }

  /**
   * 手持围栏门时的最佳落位:门带中心在玩家面前的候选里打分——
   * 端点接着现有围栏柱的优先(把门嵌进围栏线的缺口),否则取离面前最近的。
   */
  gateTarget(actor: PlayerSession): { gx: number; gz: number; dir: 'x' | 'z' } | null {
    const t = this.aheadPoint(actor);
    const bx = Math.round(t.x / FENCE_GRID);
    const bz = Math.round(t.z / FENCE_GRID);
    let best: { gx: number; gz: number; dir: 'x' | 'z' } | null = null;
    let bestScore = Infinity;
    for (let dx = -2; dx <= 1; dx++) {
      for (let dz = -2; dz <= 1; dz++) {
        for (const dir of ['x', 'z'] as const) {
          const gx = bx + dx;
          const gz = bz + dz;
          const mx = gx + (dir === 'x' ? 1 : 0);
          const mz = gz + (dir === 'z' ? 1 : 0);
          const dist = Math.hypot(mx - t.x, mz - t.z);
          if (dist > 1.4 || !this.edgeValid(gx, gz, dir)) continue;
          const ex = dir === 'x' ? gx + 2 : gx;
          const ez = dir === 'z' ? gz + 2 : gz;
          const touching =
            (this.fences.has(FenceSystem.vertexKey(gx, gz)) ? 1 : 0) +
            (this.fences.has(FenceSystem.vertexKey(ex, ez)) ? 1 : 0);
          const score = (touching > 0 ? 0 : 10) + dist;
          if (score < bestScore) {
            bestScore = score;
            best = { gx, gz, dir };
          }
        }
      }
    }
    return best;
  }

  // ---- 统一安放的委托助手 ----

  /** 被幽灵预览临时补过横杆的柱(落点变化或收起预览后移除补杆) */
  private previewLinked: Fence[] = [];
  /** 预览补杆的幽灵材质(与安放系统的可用色同款观感) */
  private previewRailMat = previewGhostMaterial(PREVIEW_OK);

  /** 围栏幽灵预览的落位刷新:横杆按目标格点的实际邻居显隐(仅柱对柱),并给相邻已有柱补出朝向预览柱的横杆 */
  applyGhost(preview: THREE.Object3D, gx: number, gz: number): void {
    const conns = this.connectionsOf(gx, gz);
    for (const rail of ghostRailsOf(preview)) {
      rail.visible = conns[rail.name.slice('rail-'.length) as keyof FenceConnections];
    }
    if (!this.vertexValid(gx, gz)) {
      this.clearPreviewLinks();
      return;
    }
    this.applyPreviewLinks(new Set([FenceSystem.vertexKey(gx, gz)]));
  }

  /** 围栏门幽灵预览的连接加亮:门带两端门框立柱视作占位柱,相邻已有柱补出朝向它们的横杆 */
  applyGateGhostLinks(actor: PlayerSession): void {
    const t = this.gateTarget(actor);
    if (!t) {
      this.clearPreviewLinks();
      return;
    }
    const ex = t.gx + (t.dir === 'x' ? 2 : 0);
    const ez = t.gz + (t.dir === 'z' ? 2 : 0);
    this.applyPreviewLinks(new Set([FenceSystem.vertexKey(t.gx, t.gz), FenceSystem.vertexKey(ex, ez)]));
  }

  /** 收起幽灵预览:移除相邻柱上的幽灵补杆 */
  clearPreviewLinks(): void {
    for (const fence of this.previewLinked) fence.clearPreviewRails();
    this.previewLinked = [];
  }

  /**
   * 把预览柱当作已放置,给相邻已有柱以幽灵材质叠加朝向它的补杆横杆;
   * 真实网格不动,落点变化后不再是邻居或收起预览时移除补杆。
   */
  private applyPreviewLinks(virtualFences: ReadonlySet<string>): void {
    const candidates = new Set<Fence>();
    const addAt = (x: number, z: number) => {
      const fence = this.fences.get(FenceSystem.vertexKey(x, z));
      if (fence) candidates.add(fence);
    };
    for (const key of virtualFences) {
      const [x, z] = key.split(':').map(Number);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) addAt(x + dx, z + dz);
    }
    const showing: Fence[] = [];
    for (const fence of candidates) {
      const real = this.connectionsOf(fence.gx, fence.gz);
      const virtual = this.connsWith(fence.gx, fence.gz, virtualFences);
      const extra: FenceConnections = {
        px: virtual.px && !real.px,
        nx: virtual.nx && !real.nx,
        pz: virtual.pz && !real.pz,
        nz: virtual.nz && !real.nz,
      };
      if (extra.px || extra.nx || extra.pz || extra.nz) {
        fence.showPreviewRails(extra, this.previewRailMat);
        showing.push(fence);
      } else {
        fence.clearPreviewRails();
      }
    }
    for (const fence of this.previewLinked) {
      if (!candidates.has(fence)) fence.clearPreviewRails();
    }
    this.previewLinked = showing;
  }

  /** 围栏门幽灵预览的朝向:与目标门带方向一致 */
  gateGhostRotY(actor: PlayerSession): number {
    const t = this.gateTarget(actor);
    return t ? (t.dir === 'x' ? 0 : Math.PI / 2) : 0;
  }

  // ---- 挖除 ----

  /** 正在挖围栏/门 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.states.get(actor)?.digTarget;
  }

  /** 世界侧每帧更新:门对最近玩家的靠近自动开合,并向玩家所在一侧的对侧打开;各玩家的放置/挖掘由 updateActor 推进 */
  update(delta: number, players = [...this.states.keys()].map((actor) => actor.player.group.position)): void {
    for (const gate of this.gates.values()) {
      // 门局部 +z 轴在世界系中的方向(门朝向只可能是 0 或 90 度,轴向无误差)
      const localZ = gate.dir === 'x' ? { x: 0, z: 1 } : { x: 1, z: 0 };
      let near: boolean = false;
      let side: 1 | -1 = 1;
      for (const p of players) {
        if (Math.hypot(p.x - gate.centerX, p.z - gate.centerZ) < GATE_AUTO_RANGE) {
          near = true;
          side = (p.x - gate.centerX) * localZ.x + (p.z - gate.centerZ) * localZ.z >= 0 ? 1 : -1;
          break;
        }
      }
      gate.setPlayerNear(near, side);
      gate.update(delta);
    }
    // 门开合会改变阻挡,统一在帧末重算
    if (this.gates.size > 0) this.rebuildSegments();
  }

  /** 每帧推进该玩家的自动挖掘;帧末统一提交持有的动作,交互结束时自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      const holding = actor.player.currentTool === 'shovel';
      let target: { kind: 'fence' | 'gate'; key: string } | null = null;
      if (holding && !actor.player.isSwimming && !this.isBusy(actor)) {
        target = this.findDigTarget(actor);
      }
      if (!target || actor.player.isMoving) {
        st.digTarget = null;
        st.swingTimer = 0;
        st.hits = 0;
        return;
      }
      st.digTarget = target;
      st.hold.hold(actor.player, 'mine');
      st.swingTimer += delta;
      if (st.swingTimer < SWING_TIME) return;
      st.swingTimer = 0;
      st.hits += 1;
      this.fx.burst(this.digCenter(target), '#a97b48', 6);
      if (st.hits < (shovelHits(actor.tools.shovel))) return;
      st.hits = 0;
      st.digTarget = null;
      const center = this.digCenter(target);
      this.removeByKey(actor, target.kind, target.key);
      this.fx.burst(center, '#a97b48', 14);
    } finally {
      st.hold.commit(actor.player);
    }
  }

  /** 挖掘目标的世界中心点 */
  private digCenter(target: { kind: 'fence' | 'gate'; key: string }): THREE.Vector3 {
    if (target.kind === 'fence') {
      const fence = this.fences.get(target.key)!;
      return new THREE.Vector3(fence.gx, this.terrain.getHeight(fence.gx, fence.gz) + 0.4, fence.gz);
    }
    const gate = this.gates.get(target.key)!;
    return new THREE.Vector3(
      gate.centerX,
      this.terrain.getHeight(gate.centerX, gate.centerZ) + 0.4,
      gate.centerZ
    );
  }

  /** 铲子范围内最近的围栏柱或门 */
  private findDigTarget(actor: PlayerSession): { kind: 'fence' | 'gate'; key: string } | null {
    const p = actor.player.group.position;
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
      const d = (gate.centerX - p.x) ** 2 + (gate.centerZ - p.z) ** 2;
      if (d < bestDist) {
        best = { kind: 'gate', key };
        bestDist = d;
      }
    }
    return best;
  }

  /** 挖走围栏/门:变回道具入包并刷新周围连接 */
  private removeByKey(actor: PlayerSession, kind: 'fence' | 'gate', key: string): void {
    let gx: number;
    let gz: number;
    if (kind === 'fence') {
      const fence = this.fences.get(key)!;
      gx = fence.gx;
      gz = fence.gz;
      fence.remove(this.scene);
      this.fences.delete(key);
      this.onFenceChanged?.({ op: 'remove', id: this.fenceIds.get(fence) });
      this.give(fence.kind === 'branch' ? 'fenceWood' : 'fenceStone', 1, actor);
    } else {
      const gate = this.gates.get(key)!;
      gx = gate.gx;
      gz = gate.gz;
      const ex = gate.endX;
      const ez = gate.endZ;
      gate.remove(this.scene);
      this.gates.delete(key);
      this.onGateChanged?.({ op: 'remove', id: this.gateIds.get(gate) });
      this.refreshAround(ex, ez);
      this.give('fenceGate', 1, actor);
    }
    this.refreshAround(gx, gz);
    this.rebuildSegments();
  }

  /** 当前挖掘进度 0-1,未在挖掘时为 null */
  getDigProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st?.digTarget) return null;
    const need = shovelHits(actor.tools.shovel);
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  // ---- 存档 ----

  /** 所有围栏柱的存档快照(格点坐标与种类) */
  snapshotFences(): { id: string; x: number; z: number; kind: FenceKind }[] {
    return [...this.fences.values()].map((f) => ({ id: this.fenceIds.get(f), x: f.gx, z: f.gz, kind: f.kind }));
  }

  /** 所有门的存档快照(边起点格点与方向) */
  snapshotGates(): { id: string; x: number; z: number; dir: 'x' | 'z' }[] {
    return [...this.gates.values()].map((g) => ({ id: this.gateIds.get(g), x: g.gx, z: g.gz, dir: g.dir }));
  }

  /** 清空场上全部围栏与门,阻挡线段一并重置(客人侧重放世界快照前调用) */
  clear(): void {
    for (const fence of this.fences.values()) fence.remove(this.scene);
    for (const gate of this.gates.values()) gate.remove(this.scene);
    this.fences.clear();
    this.gates.clear();
    this.segments = [];
  }

  /** 从存档恢复围栏与门(连接与阻挡统一重建) */
  restore(
    fences: { id?: string; x: number; z: number; kind: FenceKind }[],
    gates: { id?: string; x: number; z: number; dir: 'x' | 'z' }[]
  ): void {
    for (const f of fences) {
      if (this.fences.has(FenceSystem.vertexKey(f.x, f.z))) continue;
      const fence = new Fence(this.scene, f.x, f.z, f.kind, this.terrain.getHeight(f.x, f.z));
      this.fenceIds.set(fence, f.id);
      this.fences.set(FenceSystem.vertexKey(f.x, f.z), fence);
    }
    for (const g of gates) {
      const key = FenceSystem.edgeKey(g.x, g.z, g.dir);
      if (this.gates.has(key)) continue;
      const y =
        (this.terrain.getHeight(g.x, g.z) + this.terrain.getHeight(g.x + (g.dir === 'x' ? 2 : 0), g.z + (g.dir === 'z' ? 2 : 0))) / 2;
      const gate = new FenceGate(this.scene, g.x, g.z, g.dir, y);
      this.gateIds.set(gate, g.id);
      this.gates.set(key, gate);
    }
    for (const fence of this.fences.values()) {
      fence.rebuild(this.connectionsOf(fence.gx, fence.gz));
    }
    this.rebuildSegments();
  }

  /** 客人端按稳定 id 原地增删，保留未变化围栏的模型。 */
  netApply(
    fences: { id?: string; x: number; z: number; kind: FenceKind }[],
    gates: { id?: string; x: number; z: number; dir: 'x' | 'z' }[]
  ): void {
    const fenceIds = new Set(fences.flatMap((x) => x.id ? [x.id] : []));
    for (const [key, fence] of [...this.fences]) {
      if (fenceIds.has(this.fenceIds.get(fence))) continue;
      fence.remove(this.scene);
      this.fences.delete(key);
    }
    const currentFences = new Map([...this.fences.values()].map((x) => [this.fenceIds.get(x), x]));
    for (const value of fences) {
      if (value.id && currentFences.has(value.id)) continue;
      const fence = new Fence(this.scene, value.x, value.z, value.kind, this.terrain.getHeight(value.x, value.z));
      this.fenceIds.set(fence, value.id);
      this.fences.set(FenceSystem.vertexKey(value.x, value.z), fence);
    }
    const gateIds = new Set(gates.flatMap((x) => x.id ? [x.id] : []));
    for (const [key, gate] of [...this.gates]) {
      if (gateIds.has(this.gateIds.get(gate))) continue;
      gate.remove(this.scene);
      this.gates.delete(key);
    }
    const currentGates = new Map([...this.gates.values()].map((x) => [this.gateIds.get(x), x]));
    for (const value of gates) {
      if (value.id && currentGates.has(value.id)) continue;
      const gate = new FenceGate(this.scene, value.x, value.z, value.dir, this.terrain.getHeight(value.x, value.z));
      this.gateIds.set(gate, value.id);
      this.gates.set(FenceSystem.edgeKey(value.x, value.z, value.dir), gate);
    }
    for (const fence of this.fences.values()) fence.rebuild(this.connectionsOf(fence.gx, fence.gz));
    this.rebuildSegments();
  }
}
