import * as THREE from 'three';

/** 围栏种类:木头 / 石头 */
export type FenceKind = 'wood' | 'stone';

/** 四个方向的连接标记(相邻格点有围栏或门时伸横杆) */
export type FenceConnections = { px: boolean; nx: boolean; pz: boolean; nz: boolean };

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 木围栏柱:粗糙圆木柱 */
function woodPost(mat: THREE.MeshStandardMaterial): THREE.Mesh {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.85, 6), mat);
  post.position.y = 0.42;
  post.castShadow = true;
  return post;
}

/** 石围栏柱:方石堆 + 顶帽石 */
function stonePost(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), clayMaterial('#9a9a9a'));
  body.position.y = 0.37;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.26), clayMaterial('#8a8a8a'));
  cap.position.y = 0.8;
  for (const m of [body, cap]) {
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

/**
 * 按连接方向拼装围栏网格:每个方向伸出两根横杆(各覆盖半格,相邻柱合起来无缝),
 * 连接变化时整体重建。
 */
function buildFenceMesh(kind: FenceKind, conns: FenceConnections): THREE.Group {
  const g = new THREE.Group();
  const wood = kind === 'wood';
  g.add(wood ? woodPost(clayMaterial('#a97b48')) : stonePost());

  const railMat = clayMaterial(wood ? '#b08a5a' : '#8f8f8f');
  const railLen = 0.46;
  const makeRail = (alongX: boolean, y: number): THREE.Mesh => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(
        alongX ? railLen : wood ? 0.05 : 0.1,
        wood ? 0.09 : 0.14,
        alongX ? (wood ? 0.05 : 0.1) : railLen
      ),
      railMat
    );
    rail.position.y = y;
    rail.castShadow = true;
    return rail;
  };
  for (const y of wood ? [0.3, 0.6] : [0.24, 0.56]) {
    if (conns.px) {
      const r = makeRail(true, y);
      r.position.x = 0.27;
      g.add(r);
    }
    if (conns.nx) {
      const r = makeRail(true, y);
      r.position.x = -0.27;
      g.add(r);
    }
    if (conns.pz) {
      const r = makeRail(false, y);
      r.position.z = 0.27;
      g.add(r);
    }
    if (conns.nz) {
      const r = makeRail(false, y);
      r.position.z = -0.27;
      g.add(r);
    }
  }
  return g;
}

/** 释放网格资源(重建与挖除时调用) */
function disposeMesh(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) (mat as THREE.Material).dispose();
  });
}

/** 场景中的围栏柱:落在网格顶点上,按相邻围栏/门自动伸出横杆连成整片 */
export class Fence {
  readonly group: THREE.Group;
  private mesh: THREE.Group;

  constructor(
    scene: THREE.Scene,
    public readonly gx: number,
    public readonly gz: number,
    public readonly kind: FenceKind,
    groundY: number
  ) {
    this.group = new THREE.Group();
    this.group.position.set(gx, groundY - 0.03, gz);
    this.mesh = buildFenceMesh(kind, { px: false, nx: false, pz: false, nz: false });
    this.group.add(this.mesh);
    scene.add(this.group);
  }

  /** 连接变化时重建网格(换横杆) */
  rebuild(conns: FenceConnections): void {
    this.group.remove(this.mesh);
    disposeMesh(this.mesh);
    this.mesh = buildFenceMesh(this.kind, conns);
    this.group.add(this.mesh);
  }

  /** 从场景移除并释放资源 */
  remove(scene: THREE.Scene): void {
    scene.remove(this.group);
    disposeMesh(this.mesh);
  }
}
