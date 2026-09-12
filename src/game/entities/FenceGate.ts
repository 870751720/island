import { mergeClayMeshes } from '../core/mergeClayMeshes';
import * as THREE from 'three';
import { clayMaterial } from '../world/ClayMaterial';
import { buildRails, disposeGeometries, type FenceConnections } from './Fence';

/** 门扇打开的目标角度 */
const OPEN_ANGLE = 1.35;

/** 门带两端门框柱各自的对外连接 */
export type GateConns = { start: FenceConnections; end: FenceConnections };

/** 方向键重映射:门组绕 Y 转 90 度(dir='z')时,世界方向到门局部方向的对应 */
const WORLD_TO_LOCAL: Record<'x' | 'z', Record<keyof FenceConnections, keyof FenceConnections>> = {
  x: { px: 'px', nx: 'nx', pz: 'pz', nz: 'nz' },
  z: { px: 'pz', nx: 'nz', pz: 'nx', nz: 'px' },
};

/**
 * 门带两端门框柱的对外横杆(与围栏同规格,木色):
 * 按各端四方向的世界连接拼装,坐标在门组局部空间,横杆命名 rail-s-<dir>/rail-e-<dir>(世界方向,幽灵预览显隐用)。
 * 提供 overrideMat 时不投阴影,用于在真实门上叠加幽灵补杆。
 */
export function buildGateRails(dir: 'x' | 'z', conns: GateConns, overrideMat?: THREE.MeshStandardMaterial): THREE.Group {
  const g = new THREE.Group();
  const map = WORLD_TO_LOCAL[dir];
  const localToWorld = {} as Record<keyof FenceConnections, keyof FenceConnections>;
  for (const world of ['px', 'nx', 'pz', 'nz'] as const) localToWorld[map[world]] = world;
  const startLocalX = dir === 'x' ? -1 : 1;
  for (const [end, localX] of [['start', startLocalX], ['end', -startLocalX]] as const) {
    const localConns = {} as FenceConnections;
    for (const world of ['px', 'nx', 'pz', 'nz'] as const) {
      localConns[map[world]] = conns[end][world];
    }
    const post = buildRails('branch', localConns, overrideMat);
    post.position.x = localX;
    post.traverse((o) => {
      const local = o.name.slice('rail-'.length) as keyof FenceConnections | undefined;
      if (o.name.startsWith('rail-') && local) o.name = `rail-${end}-${localToWorld[local]}`;
    });
    g.add(post);
  }
  return g;
}

/**
 * 场景中的围栏门:占两格宽的一条格点带(两端立柱、中间无柱,门扇对开),
 * 两端正好落在围栏线的格点上,左右都能与围栏连接。
 * 玩家靠近自动开门、走远自动关门;动物不会开门,关着的门是阻挡线段。
 */
export class FenceGate {
  readonly group: THREE.Group;
  private leafL: THREE.Object3D;
  private leafR: THREE.Object3D;
  private rails: THREE.Group | null = null;
  private previewRails: THREE.Group | null = null;
  private openTarget = false;
  private open = 0;
  /** 门扇摆向(门局部 +z 或 -z):由靠近的玩家站在门的哪一侧决定,总是背离玩家打开 */
  private swing: 1 | -1 = 1;
  /** 门是否已开到位(开着的门不阻挡) */
  get isOpen(): boolean {
    return this.open > 0.5;
  }

  constructor(
    scene: THREE.Scene,
    /** 门带起点格点(门从这里伸向 +x 或 +z,跨两格) */
    public readonly gx: number,
    public readonly gz: number,
    /** 门带方向:x 为东西向,z 为南北向 */
    public readonly dir: 'x' | 'z',
    groundY: number
  ) {
    this.group = new THREE.Group();
    this.group.position.set(this.centerX, groundY - 0.02, this.centerZ);
    this.group.rotation.y = dir === 'x' ? 0 : Math.PI / 2;

    const frameMat = clayMaterial('#8a6239');
    for (const x of [-0.92, 0.92]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.95, 6), frameMat);
      post.position.set(x, 0.47, 0);
      post.castShadow = true;
      this.group.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.07, 0.07), frameMat);
    beam.position.y = 0.92;
    beam.castShadow = true;
    this.group.add(beam);

    mergeClayMeshes(this.group);

    // 双扇对开:两扇门分别绕两端立柱旋转,向两侧打开
    const makeLeaf = (sign: 1 | -1): THREE.Object3D => {
      const pivot = new THREE.Group();
      pivot.position.set(0.88 * sign, 0, 0);
      const doorMat = clayMaterial('#a97b48');
      for (const y of [0.28, 0.62]) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.14, 0.05), doorMat);
        plank.position.set(-0.41 * sign, y, 0);
        plank.castShadow = true;
        pivot.add(plank);
      }
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.1), clayMaterial('#7a5a32'));
      handle.position.set(-0.76 * sign, 0.45, 0.04);
      pivot.add(handle);
      mergeClayMeshes(pivot);
      this.group.add(pivot);
      return pivot;
    };
    this.leafL = makeLeaf(-1);
    this.leafR = makeLeaf(1);
    scene.add(this.group);
  }

  /** 门带中心点(两端柱的中点) */
  get centerX(): number {
    return this.gx + (this.dir === 'x' ? 1 : 0);
  }

  get centerZ(): number {
    return this.gz + (this.dir === 'z' ? 1 : 0);
  }

  /** 门带终点格点(跨两格的另一端) */
  get endX(): number {
    return this.gx + (this.dir === 'x' ? 2 : 0);
  }

  get endZ(): number {
    return this.gz + (this.dir === 'z' ? 2 : 0);
  }

  /** 两端门框柱的对外连接横杆(相邻柱/门端柱变化时重建) */
  rebuildRails(conns: GateConns): void {
    if (this.rails) {
      this.group.remove(this.rails);
      disposeGeometries(this.rails);
    }
    this.rails = buildGateRails(this.dir, conns);
    this.group.add(this.rails);
  }

  /** 幽灵预览补杆:extra 为两端因预览物新增的连接方向,以幽灵材质叠加在真实横杆之上 */
  showPreviewRails(extra: GateConns, mat: THREE.MeshStandardMaterial): void {
    this.clearPreviewRails();
    const any = (c: FenceConnections) => c.px || c.nx || c.pz || c.nz;
    if (!any(extra.start) && !any(extra.end)) return;
    this.previewRails = buildGateRails(this.dir, extra, mat);
    this.group.add(this.previewRails);
  }

  /** 移除幽灵预览补杆 */
  clearPreviewRails(): void {
    if (!this.previewRails) return;
    this.group.remove(this.previewRails);
    disposeGeometries(this.previewRails);
    this.previewRails = null;
  }

  /** 玩家是否在门边(自动开门范围);side 为玩家相对门局部 +z/-z 侧,门向另一侧打开。
   *  开向只在门完全合上时判定一次:玩家穿门而过会让侧别翻转,若中途改摆向,开着的门会瞬移甚至扫过玩家。 */
  setPlayerNear(near: boolean, side: 1 | -1 = 1): void {
    this.openTarget = near;
    if (near && this.open === 0) this.swing = (-side) as 1 | -1;
  }

  /** 门扇缓缓对开/合拢(开启方向背离靠近的玩家) */
  update(delta: number): void {
    const speed = 4;
    this.open = THREE.MathUtils.clamp(
      this.open + (this.openTarget ? 1 : -1) * delta * speed,
      0,
      1
    );
    this.leafL.rotation.y = -OPEN_ANGLE * this.open * this.swing;
    this.leafR.rotation.y = OPEN_ANGLE * this.open * this.swing;
  }

  remove(scene: THREE.Scene): void {
    // 幽灵补杆用共享幽灵材质,先单独按几何体释放,避免误释放共享材质
    this.clearPreviewRails();
    scene.remove(this.group);
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) (mat as THREE.Material).dispose();
    });
  }
}
