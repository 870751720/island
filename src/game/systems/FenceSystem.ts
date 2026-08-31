import * as THREE from 'three';
import type { ObstacleSolver } from '../entities/Player';
import { Fence, type FenceConnections, type FenceKind } from '../entities/Fence';
import { FenceGate } from '../entities/FenceGate';
import type { ResourceKind } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';

/** 围栏网格边长:围栏柱吸附在整数格点上,相邻柱间距 1 */
const FENCE_GRID = 1;
/** 玩家面前放置围栏的距离(放置点再吸附到最近格点) */
const PLACE_AHEAD = 0.9;
/** 围栏落点离资源点的最小距离 */
const PROP_BLOCK_RANGE = 0.6;
/** 门自动开合的玩家距离 */
const GATE_AUTO_RANGE = 1.6;
/** 持锄头可开挖围栏的距离 */
const DIG_RANGE = 1.5;
/** 锄头挖围栏的命中次数(精致锄 1 次) */
const DIG_HITS = 2;
const SWING_TIME = 0.6;
/** 手持围栏站定自动放置的时长(秒) */
const PLACE_TIME = 2;
/** 手持围栏门站定自动放置的时长(秒) */
const GATE_PLACE_TIME = 5;
/** 放置预览的可用提示色(附近没有可放位置时预览直接隐藏) */
const PREVIEW_OK = '#7fd67f';

/** 半透明黏土预览材质(全部预览件共用,改色即整体变色) */
function previewMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PREVIEW_OK,
    emissive: PREVIEW_OK,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.7,
    flatShading: true,
    roughness: 1,
    depthWrite: false,
  });
}

/** 阻挡线段:XZ 平面上的有向线段(闭合围栏连接与关着的门) */
type Segment = { ax: number; az: number; bx: number; bz: number };

/** 每玩家的放置/挖掘进度与落点幽灵预览(围栏与门本身是世界共享的) */
type PlayerSessionState = {
  swingTimer: number;
  hits: number;
  digTarget: { kind: 'fence' | 'gate'; key: string } | null;
  placeTimer: number;
  fencePreview: THREE.Group;
  previewRails: Record<'px' | 'nx' | 'pz' | 'nz', THREE.Object3D[]>;
  gatePreview: THREE.Group;
};

/** 围栏物品 → 场上围栏种类 */
export function fenceKindOfItem(kind: ResourceKind): FenceKind | null {
  if (kind === 'fenceWood') return 'wood';
  if (kind === 'fenceStone') return 'stone';
  return null;
}

/**
 * 围栏系统(世界单实例,按发起者 actor 结算):
 * - 围栏柱吸附在整数格点上,相邻柱/门之间自动伸出横杆,沿边逐个放置即可围出无缝闭合的圈;
 * - 围栏门占一条格点边,玩家靠近自动开、走远自动关,动物不会开门;
 * - 围栏连接与关着的门构成阻挡线段:玩家移动被推出,动物(兔/羊/鹿/熊/蟹)绕行判定被挡住;
 * - 手持锄头靠近站定自动把围栏/门挖回道具。
 */
export class FenceSystem implements ObstacleSolver {
  private fences = new Map<string, Fence>();
  private gates = new Map<string, FenceGate>();
  private segments: Segment[] = [];
  private states = new Map<PlayerSession, PlayerSessionState>();
  private previewMat = previewMaterial();

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
      // 落点幽灵预览:手持围栏/门时常驻显示,绿=可放、红=不可放
      const fencePreview = new THREE.Group();
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.09, 0.85, 6),
        this.previewMat
      );
      post.position.y = 0.42;
      fencePreview.add(post);
      const previewRails: Record<'px' | 'nx' | 'pz' | 'nz', THREE.Object3D[]> = {
        px: [], nx: [], pz: [], nz: [],
      };
      const railOffsets: Record<'px' | 'nx' | 'pz' | 'nz', [number, number]> = {
        px: [0.27, 0],
        nx: [-0.27, 0],
        pz: [0, 0.27],
        nz: [0, -0.27],
      };
      for (const dir of ['px', 'nx', 'pz', 'nz'] as const) {
        for (const y of [0.3, 0.6]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.05), this.previewMat);
          rail.position.set(railOffsets[dir][0], y, railOffsets[dir][1]);
          if (dir === 'pz' || dir === 'nz') rail.rotation.y = Math.PI / 2;
          fencePreview.add(rail);
          previewRails[dir].push(rail);
        }
      }
      fencePreview.visible = false;
      this.scene.add(fencePreview);

      const gatePreview = new THREE.Group();
      for (const x of [-0.92, 0.92]) {
        const gatePost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.95, 6), this.previewMat);
        gatePost.position.set(x, 0.47, 0);
        gatePreview.add(gatePost);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.07, 0.07), this.previewMat);
      beam.position.y = 0.92;
      gatePreview.add(beam);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 0.05), this.previewMat);
      leaf.position.set(0, 0.45, 0);
      gatePreview.add(leaf);
      gatePreview.visible = false;
      this.scene.add(gatePreview);

      st = { swingTimer: 0, hits: 0, digTarget: null, placeTimer: 0, fencePreview, previewRails, gatePreview };
      this.states.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人进度与落点预览 */
  detach(actor: PlayerSession): void {
    const st = this.states.get(actor);
    if (!st) return;
    this.scene.remove(st.fencePreview, st.gatePreview);
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

  /** 某条单位边是否被门占据(门跨两格,可能从这条边或前一条边起) */
  private gateAt(gx: number, gz: number, dir: 'x' | 'z'): boolean {
    const backX = dir === 'x' ? gx - 1 : gx;
    const backZ = dir === 'z' ? gz - 1 : gz;
    return (
      this.gates.has(FenceSystem.edgeKey(gx, gz, dir)) ||
      this.gates.has(FenceSystem.edgeKey(backX, backZ, dir))
    );
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
    const item: ResourceKind = kind === 'wood' ? 'fenceWood' : 'fenceStone';
    const target = this.pickVertex(actor);
    if (actor.inventory.count(item) <= 0 || !target) return false;
    const { gx, gz } = target;
    actor.inventory.remove(item, 1);
    const y = this.terrain.getHeight(gx, gz);
    this.fences.set(FenceSystem.vertexKey(gx, gz), new Fence(this.scene, gx, gz, kind, y));
    this.refreshAround(gx, gz);
    this.rebuildSegments();
    this.audio.play('success');
    const fxPos = new THREE.Vector3(gx, y + 0.5, gz);
    this.fx.burst(fxPos, kind === 'wood' ? '#a97b48' : '#9a9a9a', 10);
    return true;
  }

  /** 某格点是否允许立围栏柱(空、干地、不被资源点占住) */
  private vertexValid(gx: number, gz: number): boolean {
    if (this.fences.has(FenceSystem.vertexKey(gx, gz))) return false;
    const p = new THREE.Vector3(gx, 0, gz);
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(gx, gz) <= 0) return false;
    return !this.props.isOccupied(p, PROP_BLOCK_RANGE);
  }

  /**
   * 手持围栏时的最佳落点:面前附近一圈格点里打分——
   * 能与现有围栏/门相连的格点优先(接上玩家身边的围栏线),否则取离面前最近的。
   */
  private pickVertex(actor: PlayerSession): { gx: number; gz: number } | null {
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
    const target = this.pickEdge(actor);
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
  private pickEdge(actor: PlayerSession): { gx: number; gz: number; dir: 'x' | 'z' } | null {
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

  // ---- 手持自动放置 ----

  /** 手持围栏时背包里排最前面的围栏道具对应的场上种类(没围栏道具或非手持为 null) */
  private heldFenceKind(actor: PlayerSession): FenceKind | null {
    if (actor.player.currentTool !== 'fence') return null;
    const slot = actor.inventory
      .snapshot()
      .find((s) => s?.kind === 'fenceWood' || s?.kind === 'fenceStone');
    return slot ? fenceKindOfItem(slot.kind) : null;
  }

  /** 正在手持围栏/门放置中 */
  isPlacing(actor: PlayerSession): boolean {
    return (this.states.get(actor)?.placeTimer ?? 0) > 0;
  }

  /** 当前放置进度 0-1,未在放置时为 null */
  getPlaceProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st || st.placeTimer <= 0) return null;
    const need = actor.player.currentTool === 'fenceGate' ? GATE_PLACE_TIME : PLACE_TIME;
    return Math.min(st.placeTimer / need, 1);
  }

  /** 手持围栏/门站定自动放到面前的格点(边)上,面前已满或不可放则不打扰 */
  private updateAutoPlace(actor: PlayerSession, st: PlayerSessionState, delta: number): void {
    const fenceKind = this.heldFenceKind(actor);
    const gate = actor.player.currentTool === 'fenceGate';
    const item: ResourceKind | null = fenceKind
      ? fenceKind === 'wood'
        ? 'fenceWood'
        : 'fenceStone'
      : gate
        ? 'fenceGate'
        : null;
    const placeable =
      item !== null &&
      !actor.player.isMoving &&
      !actor.player.isSwimming &&
      !this.isBusy(actor) &&
      (fenceKind ? this.pickVertex(actor) !== null : this.pickEdge(actor) !== null);
    if (!placeable) {
      st.placeTimer = 0;
      return;
    }
    actor.player.setAction('craft');
    st.placeTimer += delta;
    const need = gate ? GATE_PLACE_TIME : PLACE_TIME;
    if (st.placeTimer < need) return;
    st.placeTimer = 0;
    if (fenceKind) this.useFence(actor, fenceKind);
    else this.useGate(actor);
  }

  // ---- 落点预览 ----

  /** 手持围栏/门时在面前吸附点常驻半透明预览:绿=可放、红=不可放;横杆按当前邻居实时显示 */
  private updatePreview(actor: PlayerSession, st: PlayerSessionState): void {
    const fenceKind = this.heldFenceKind(actor);
    const gate = actor.player.currentTool === 'fenceGate';
    if ((!fenceKind && !gate) || actor.player.isSwimming) {
      st.fencePreview.visible = false;
      st.gatePreview.visible = false;
      return;
    }
    if (fenceKind) {
      st.gatePreview.visible = false;
      const target = this.pickVertex(actor);
      if (target) {
        const conns = this.connectionsOf(target.gx, target.gz);
        for (const dir of ['px', 'nx', 'pz', 'nz'] as const) {
          for (const rail of st.previewRails[dir]) rail.visible = conns[dir];
        }
        st.fencePreview.position.set(
          target.gx,
          this.terrain.getHeight(target.gx, target.gz) - 0.03,
          target.gz
        );
        st.fencePreview.visible = true;
      } else {
        st.fencePreview.visible = false;
      }
      return;
    }
    st.fencePreview.visible = false;
    const target = this.pickEdge(actor);
    if (target) {
      const mx = target.gx + (target.dir === 'x' ? 1 : 0);
      const mz = target.gz + (target.dir === 'z' ? 1 : 0);
      st.gatePreview.position.set(mx, this.terrain.getHeight(mx, mz) - 0.02, mz);
      st.gatePreview.rotation.y = target.dir === 'x' ? 0 : Math.PI / 2;
      st.gatePreview.visible = true;
    } else {
      st.gatePreview.visible = false;
    }
  }

  // ---- 挖除 ----

  /** 正在挖围栏/门 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.states.get(actor)?.digTarget;
  }

  /** 世界侧每帧更新:门对任一玩家的靠近自动开合;各玩家的放置/挖掘由 updateActor 推进 */
  update(delta: number): void {
    const players = [...this.states.keys()].map((actor) => actor.player.group.position);
    for (const gate of this.gates.values()) {
      gate.setPlayerNear(players.some((p) => Math.hypot(p.x - gate.centerX, p.z - gate.centerZ) < GATE_AUTO_RANGE));
      gate.update(delta);
    }
    // 门开合会改变阻挡,统一在帧末重算
    if (this.gates.size > 0) this.rebuildSegments();
  }

  /** 每帧推进该玩家的落点预览、自动放置与自动挖掘 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    this.updatePreview(actor, st);
    this.updateAutoPlace(actor, st, delta);

    const holding = actor.player.currentTool === 'hoe';
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
    actor.player.setAction('mine');
    st.swingTimer += delta;
    if (st.swingTimer < SWING_TIME) return;
    st.swingTimer = 0;
    st.hits += 1;
    this.fx.burst(this.digCenter(target), '#a97b48', 6);
    if (st.hits < (actor.tools.hoe >= 2 ? 1 : DIG_HITS)) return;
    st.hits = 0;
    st.digTarget = null;
    const center = this.digCenter(target);
    this.removeByKey(actor, target.kind, target.key);
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
    return new THREE.Vector3(
      gate.centerX,
      this.terrain.getHeight(gate.centerX, gate.centerZ) + 0.4,
      gate.centerZ
    );
  }

  /** 锄头范围内最近的围栏柱或门 */
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
      this.give(fence.kind === 'wood' ? 'fenceWood' : 'fenceStone', 1, actor);
    } else {
      const gate = this.gates.get(key)!;
      gx = gate.gx;
      gz = gate.gz;
      const ex = gate.endX;
      const ez = gate.endZ;
      gate.remove(this.scene);
      this.gates.delete(key);
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
    const need = actor.tools.hoe >= 2 ? 1 : DIG_HITS;
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
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
      const y =
        (this.terrain.getHeight(g.x, g.z) + this.terrain.getHeight(g.x + (g.dir === 'x' ? 2 : 0), g.z + (g.dir === 'z' ? 2 : 0))) / 2;
      this.gates.set(key, new FenceGate(this.scene, g.x, g.z, g.dir, y));
    }
    for (const fence of this.fences.values()) {
      fence.rebuild(this.connectionsOf(fence.gx, fence.gz));
    }
    this.rebuildSegments();
  }
}
