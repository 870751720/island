import { mergeClayMeshes } from '../core/mergeClayMeshes';
import * as THREE from 'three';
import type { ResourceKind } from '../systems/Inventory';
import { clayMaterial } from '../world/ClayMaterial';


/** 程序化拼装的酿酒桶模型:深色橡木桶身 + 铁箍 + 桶口漂浮的酒液光斑 */
function makeBarrelMesh(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = clayMaterial('#6b4a2e');
  const bandMat = clayMaterial('#3d4147');

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.6, 10), woodMat);
  body.position.y = 0.3;
  body.castShadow = true;
  g.add(body);

  for (const y of [0.13, 0.47]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(y === 0.13 ? 0.285 : 0.315, 0.028, 6, 12), bandMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }

  // 桶口发酵的酒液光斑:桶内有原料时亮起并缓慢浮动旋转
  const blobMat = new THREE.MeshStandardMaterial({
    color: '#8e3a52',
    emissive: new THREE.Color('#b0496b'),
    emissiveIntensity: 0.8,
    flatShading: true,
    roughness: 0.8,
  });
  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), blobMat);
  blob.position.y = 0.7;
  blob.name = 'wineBlob';
  g.add(blob);

  mergeClayMeshes(g, [blob]);
  return g;
}

/**
 * 场景中的酿酒桶摆件:一次只酿一种酒,每 45 秒把 2 个原料发酵成 1 瓶;
 * 桶内还有原料时桶口的酒液光斑发亮浮动,空桶时收起。
 */
export class BrewBarrel {
  readonly group: THREE.Group;
  /** 当前酿造的原料种类(桶空且无产出时为 null,此时可换酒种) */
  kind: ResourceKind | null = null;
  /** 桶内剩余原料数 */
  rawLeft = 0;
  /** 已酿好待收取的酒瓶数 */
  bottles = 0;
  /** 距离下一瓶酿好的剩余秒数(原料不足时为满值) */
  tickLeft = 0;
  private blob: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene, position: THREE.Vector3, rotY = 0) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y -= 0.02;
    this.group.rotation.y = rotY;
    scene.add(this.group);
    const mesh = makeBarrelMesh();
    this.blob = mesh.getObjectByName('wineBlob') ?? null;
    this.group.add(mesh);
  }

  get busy(): boolean {
    return this.rawLeft > 0 || this.bottles > 0;
  }

  /** 投入原料(桶被占用时只接受同种原料) */
  addRaw(kind: ResourceKind, count: number): boolean {
    if (this.busy && this.kind !== kind) return false;
    this.kind = kind;
    this.rawLeft += count;
    return true;
  }

  /** 每帧表现:有原料时酒液光斑发亮浮动旋转,空桶时收起 */
  update(elapsed: number): void {
    if (!this.blob) return;
    const active = this.rawLeft > 0;
    this.blob.visible = active;
    if (active) {
      const bob = Math.sin(elapsed * 2.6) * 0.04;
      this.blob.position.y = 0.7 + bob;
      this.blob.rotation.y = elapsed * 1.2;
      this.blob.rotation.x = Math.sin(elapsed * 1.8) * 0.3;
    }
  }
}
