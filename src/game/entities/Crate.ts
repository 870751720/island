import { mergeClayMeshes } from '../core/mergeClayMeshes';
import * as THREE from 'three';
import { Inventory } from '../systems/Inventory';
import { makeDropModel } from '../systems/DropModels';
import type { ResourceKind } from '../systems/Inventory';
import { clayMaterial } from '../world/ClayMaterial';

/** 箱子道具种类:木箱与铁箱(同模型,铁箱换铁色并扩到 20 格) */
export type CrateKind = 'crate' | 'ironCrate';

/** 木箱收纳格数 */
export const CRATE_CAPACITY = 10;

/** 各箱种的静态属性:收纳格数与模型配色 */
const CRATE_STYLES: Record<CrateKind, { capacity: number; body: string; band: string }> = {
  crate: { capacity: 10, body: '#a97b48', band: '#7a5a32' },
  ironCrate: { capacity: 20, body: '#9aa3ab', band: '#697076' },
};

/** 按道具种类取收纳格数 */
export function crateCapacity(kind: CrateKind): number {
  return CRATE_STYLES[kind].capacity;
}

const BODY_HALF = 0.33; // 箱体半宽(X/Z)
const BODY_H = 0.5; // 箱体高
const ICON_SPIN_SPEED = Math.PI / 3; // 顶面标识自转速度(弧度/秒)


/** 程序化拼装的箱体模型:正方形箱体 + 四面对称的封边条与四角护柱,任意朝向观感一致 */
function makeCrateMesh(kind: CrateKind): THREE.Group {
  const g = new THREE.Group();
  const style = CRATE_STYLES[kind];
  const woodMat = clayMaterial(style.body);
  const bandMat = clayMaterial(style.band);

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
  mergeClayMeshes(g);
  return g;
}

/** 场景中的木箱/铁箱摆件:自带收纳空间(木箱 10 格、铁箱 20 格),靠近可存取物品;顶面展示第一个格子的道具模型 */
export class Crate {
  readonly group: THREE.Group;
  readonly storage: Inventory;
  readonly kind: CrateKind;
  /** 箱体主色(挖掘粒子等表现用) */
  readonly color: string;
  private iconLayer = new THREE.Group();
  private iconKind: ResourceKind | null = null;

  constructor(scene: THREE.Scene, position: THREE.Vector3, kind: CrateKind = 'crate', rotY = 0) {
    this.kind = kind;
    this.color = CRATE_STYLES[kind].body;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y -= 0.02;
    this.group.rotation.y = rotY;
    scene.add(this.group);
    this.group.add(makeCrateMesh(kind));
    this.group.add(this.iconLayer);
    this.storage = new Inventory();
    this.storage.setCapacity(CRATE_STYLES[kind].capacity);
  }

  /** 顶面内容标识缓慢自转 */
  update(delta: number): void {
    this.iconLayer.rotation.y += ICON_SPIN_SPEED * delta;
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
