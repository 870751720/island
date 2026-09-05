import * as THREE from 'three';

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 门扇打开的目标角度 */
const OPEN_ANGLE = 1.35;

/**
 * 场景中的围栏门:占两格宽的一条格点带(两端立柱、中间无柱,门扇对开),
 * 两端正好落在围栏线的格点上,左右都能与围栏连接。
 * 玩家靠近自动开门、走远自动关门;动物不会开门,关着的门是阻挡线段。
 */
export class FenceGate {
  readonly group: THREE.Group;
  private leafL: THREE.Object3D;
  private leafR: THREE.Object3D;
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

    // 双扇对开:两扇门分别绕两端立柱旋转,向两侧打开
    const makeLeaf = (sign: 1 | -1): THREE.Object3D => {
      const pivot = new THREE.Object3D();
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
