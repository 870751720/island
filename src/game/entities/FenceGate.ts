import * as THREE from 'three';

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 门扇打开的目标角度 */
const OPEN_ANGLE = 1.35;

/**
 * 场景中的围栏门:占一条网格边(两个围栏顶点之间),
 * 门框两端立柱,门扇绕一端立柱旋转开合。玩家靠近自动开门,走远自动关门;
 * 动物不会开门,关着的门是阻挡线段。
 */
export class FenceGate {
  readonly group: THREE.Group;
  private leaf: THREE.Object3D;
  private openTarget = false;
  private open = 0;
  /** 门是否已开到位(开着的门不阻挡) */
  get isOpen(): boolean {
    return this.open > 0.5;
  }

  constructor(
    scene: THREE.Scene,
    /** 边起点格点(边从这里伸向 +x 或 +z) */
    public readonly gx: number,
    public readonly gz: number,
    /** 边方向:x 为东西边,z 为南北边 */
    public readonly dir: 'x' | 'z',
    groundY: number,
    /** 边中点世界坐标 */
    mx: number,
    mz: number
  ) {
    this.group = new THREE.Group();
    this.group.position.set(mx, groundY - 0.02, mz);
    this.group.rotation.y = dir === 'x' ? 0 : Math.PI / 2;

    const frameMat = clayMaterial('#8a6239');
    for (const x of [-0.44, 0.44]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.9, 6), frameMat);
      post.position.set(x, 0.45, 0);
      post.castShadow = true;
      this.group.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.06, 0.06), frameMat);
    beam.position.y = 0.88;
    beam.castShadow = true;
    this.group.add(beam);

    // 门扇绕一端立柱旋转:扇叶从转轴伸向另一端
    this.leaf = new THREE.Object3D();
    this.leaf.position.set(-0.42, 0, 0);
    const doorMat = clayMaterial('#a97b48');
    for (const y of [0.28, 0.62]) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.14, 0.05), doorMat);
      plank.position.set(0.42, y, 0);
      plank.castShadow = true;
      this.leaf.add(plank);
    }
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.1), clayMaterial('#7a5a32'));
    handle.position.set(0.78, 0.45, 0.04);
    this.leaf.add(handle);
    this.group.add(this.leaf);
    scene.add(this.group);
  }

  /** 玩家是否在门边(自动开门范围) */
  setPlayerNear(near: boolean): void {
    this.openTarget = near;
  }

  /** 门扇缓缓开合 */
  update(delta: number): void {
    const speed = 4;
    this.open = THREE.MathUtils.clamp(
      this.open + (this.openTarget ? 1 : -1) * delta * speed,
      0,
      1
    );
    this.leaf.rotation.y = -OPEN_ANGLE * this.open;
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
