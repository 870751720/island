import * as THREE from 'three';
import type { ResourceKind } from '../systems/Inventory';

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 程序化拼装的饵料桶模型:木桶身 + 两道桶箍 + 桶口发酵的鱼饵团 */
function makeBarrelMesh(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = clayMaterial('#9a6b3f');
  const bandMat = clayMaterial('#5f452a');

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.56, 10), woodMat);
  body.position.y = 0.28;
  body.castShadow = true;
  g.add(body);

  for (const y of [0.12, 0.44]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(y === 0.12 ? 0.265 : 0.295, 0.025, 6, 12), bandMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }

  // 桶口发酵的鱼饵团:桶内有食物时亮起并缓慢浮动旋转
  const blobMat = new THREE.MeshStandardMaterial({
    color: '#c8a24e',
    emissive: new THREE.Color('#d98c3f'),
    emissiveIntensity: 0.8,
    flatShading: true,
    roughness: 0.8,
  });
  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), blobMat);
  blob.position.y = 0.66;
  blob.name = 'baitBlob';
  g.add(blob);

  return g;
}

/**
 * 场景中的饵料桶摆件:投入的食物每 5 秒发酵 1 个为对应数量的鱼饵;
 * 桶内还有食物时桶口的鱼饵团发亮浮动,空桶时收起。
 */
export class BaitBarrel {
  readonly group: THREE.Group;
  /** 桶内待发酵的食物(按投入顺序排列,同种合并) */
  foods: { kind: ResourceKind; count: number }[] = [];
  /** 已发酵好待收取的鱼饵数 */
  bait = 0;
  /** 距离下一次发酵的剩余秒数(无食物时为满值) */
  tickLeft = 0;
  private blob: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene, position: THREE.Vector3, rotY = 0) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y -= 0.02;
    this.group.rotation.y = rotY;
    scene.add(this.group);
    const mesh = makeBarrelMesh();
    this.blob = mesh.getObjectByName('baitBlob') ?? null;
    this.group.add(mesh);
  }

  get hasFood(): boolean {
    return this.foods.length > 0;
  }

  /** 投入一个食物(同种合并到已有格,新食物排到队尾) */
  addFood(kind: ResourceKind, count: number): void {
    const slot = this.foods.find((f) => f.kind === kind);
    if (slot) slot.count += count;
    else this.foods.push({ kind, count });
  }

  /** 每帧表现:有食物时鱼饵团发亮浮动旋转,空桶时收起 */
  update(elapsed: number): void {
    if (!this.blob) return;
    const active = this.hasFood;
    this.blob.visible = active;
    if (active) {
      const bob = Math.sin(elapsed * 3) * 0.04;
      this.blob.position.y = 0.66 + bob;
      this.blob.rotation.y = elapsed * 1.4;
      this.blob.rotation.x = Math.sin(elapsed * 2) * 0.3;
    }
  }
}
