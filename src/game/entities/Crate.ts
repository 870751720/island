import * as THREE from 'three';
import { Inventory } from '../systems/Inventory';
import { makeDropModel } from '../systems/DropModels';
import type { ResourceKind } from '../systems/Inventory';

export const CRATE_CAPACITY = 10;

const BODY_HALF = 0.33; // 箱体半宽(X/Z)
const BODY_H = 0.5; // 箱体高

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 程序化拼装的木箱模型:正方形箱体 + 四面对称的封边条与四角护柱,任意朝向观感一致 */
function makeCrateMesh(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = clayMaterial('#a97b48');
  const bandMat = clayMaterial('#7a5a32');

  const body = new THREE.Mesh(new THREE.BoxGeometry(BODY_HALF * 2, BODY_H, BODY_HALF * 2), woodMat);
  body.position.y = BODY_H / 2;
  body.castShadow = true;
  g.add(body);

  // 四面各两条横向封边(上下),与四角护柱
  for (let i = 0; i < 4; i++) {
    const face = new THREE.Group();
    face.rotation.y = (i * Math.PI) / 2;
    for (const y of [0.08, 0.42]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.07), bandMat);
      band.position.set(0, y, BODY_HALF);
      band.castShadow = true;
      face.add(band);
    }
    g.add(face);
  }
  for (const x of [-BODY_HALF, BODY_HALF]) {
    for (const z of [-BODY_HALF, BODY_HALF]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.08), bandMat);
      post.position.set(x, BODY_H / 2, z);
      post.castShadow = true;
      g.add(post);
    }
  }
  return g;
}

/** 场景中的木箱摆件:自带 10 格收纳空间,靠近可存取物品;顶面展示第一个格子的道具模型 */
export class Crate {
  readonly group: THREE.Group;
  readonly storage: Inventory;
  private iconLayer = new THREE.Group();
  private iconKind: ResourceKind | null = null;

  constructor(scene: THREE.Scene, position: THREE.Vector3, rotY = 0) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y -= 0.02;
    this.group.rotation.y = rotY;
    scene.add(this.group);
    this.group.add(makeCrateMesh());
    this.group.add(this.iconLayer);
    this.storage = new Inventory();
  }

  /** 按当前箱内第一个格子刷新各面上的内容标识(无物品时清空) */
  updateIcon(): void {
    const kind = this.storage.snapshot().find((slot) => slot)?.kind ?? null;
    if (kind === this.iconKind) return;
    this.iconKind = kind;
    this.group.remove(this.iconLayer);
    this.iconLayer = new THREE.Group();
    if (kind) {
      const topIcon = makeDropModel(kind);
      topIcon.position.y = BODY_H + 0.1;
      this.iconLayer.add(topIcon);
    }
    this.group.add(this.iconLayer);
  }
}
