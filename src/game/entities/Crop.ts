import * as THREE from 'three';
import type { ResourceKind } from '../systems/Inventory';
import { CROP_MESH_MAKERS } from './cropMeshes';

export type CropKind =
  | 'carrot'
  | 'wheat'
  | 'potato'
  | 'sweetPotato'
  | 'corn'
  | 'soybean'
  | 'tomato'
  | 'pepper'
  | 'eggplant'
  | 'strawberry'
  | 'cabbage'
  | 'pumpkin';

/** 生长阶段:幼苗 → 未成熟 → 成熟 */
export type CropStage = 0 | 1 | 2;

/** 一种作物的完整规格:种子/产出道具、各阶段生长时长(秒)、成熟产出数量与展示名 */
export type CropSpec = {
  kind: CropKind;
  name: string;
  seed: ResourceKind;
  product: ResourceKind;
  /** 幼苗 → 未成熟所需秒数 */
  sproutSeconds: number;
  /** 未成熟 → 成熟所需秒数 */
  immatureSeconds: number;
  /** 成熟采收时的掉落数量 */
  yieldCount: number;
  /** 采收粒子/特效色 */
  fxColor: string;
};

/** 作物规格表:阶段时长按种类各自配置,当前两种作物先统一各 2 分钟 */
export const CROP_SPECS: Record<CropKind, CropSpec> = {
  carrot: {
    kind: 'carrot',
    name: '胡萝卜',
    seed: 'carrotSeed',
    product: 'carrot',
    sproutSeconds: 120,
    immatureSeconds: 120,
    yieldCount: 2,
    fxColor: '#e07b2a',
  },
  wheat: {
    kind: 'wheat',
    name: '小麦',
    seed: 'wheatSeed',
    product: 'wheat',
    sproutSeconds: 120,
    immatureSeconds: 120,
    yieldCount: 2,
    fxColor: '#e8c56a',
  },
  potato: { kind: 'potato', name: '土豆', seed: 'potatoSeed', product: 'potato', sproutSeconds: 120, immatureSeconds: 120, yieldCount: 2, fxColor: '#c9a06a' },
  sweetPotato: { kind: 'sweetPotato', name: '红薯', seed: 'sweetPotatoSeed', product: 'sweetPotato', sproutSeconds: 180, immatureSeconds: 180, yieldCount: 2, fxColor: '#c96a3a' },
  corn: { kind: 'corn', name: '玉米', seed: 'cornSeed', product: 'corn', sproutSeconds: 120, immatureSeconds: 120, yieldCount: 2, fxColor: '#e8c56a' },
  soybean: { kind: 'soybean', name: '大豆', seed: 'soybeanSeed', product: 'soybean', sproutSeconds: 180, immatureSeconds: 180, yieldCount: 3, fxColor: '#9aa74e' },
  tomato: { kind: 'tomato', name: '番茄', seed: 'tomatoSeed', product: 'tomato', sproutSeconds: 120, immatureSeconds: 120, yieldCount: 2, fxColor: '#d94a3a' },
  pepper: { kind: 'pepper', name: '辣椒', seed: 'pepperSeed', product: 'pepper', sproutSeconds: 120, immatureSeconds: 120, yieldCount: 3, fxColor: '#d93a2a' },
  eggplant: { kind: 'eggplant', name: '茄子', seed: 'eggplantSeed', product: 'eggplant', sproutSeconds: 180, immatureSeconds: 180, yieldCount: 2, fxColor: '#6a3a8a' },
  strawberry: { kind: 'strawberry', name: '草莓', seed: 'strawberrySeed', product: 'strawberry', sproutSeconds: 120, immatureSeconds: 120, yieldCount: 3, fxColor: '#d93a4a' },
  cabbage: { kind: 'cabbage', name: '卷心菜', seed: 'cabbageSeed', product: 'cabbage', sproutSeconds: 180, immatureSeconds: 180, yieldCount: 2, fxColor: '#8fc47a' },
  pumpkin: { kind: 'pumpkin', name: '南瓜', seed: 'pumpkinSeed', product: 'pumpkin', sproutSeconds: 300, immatureSeconds: 300, yieldCount: 1, fxColor: '#e0862a' },
};

/** 种子道具 → 作物种类的映射(播种入口用) */
export const CROP_OF_SEED: Partial<Record<ResourceKind, CropKind>> = {
  carrotSeed: 'carrot',
  wheatSeed: 'wheat',
  potatoSeed: 'potato',
  sweetPotatoSeed: 'sweetPotato',
  cornSeed: 'corn',
  soybeanSeed: 'soybean',
  tomatoSeed: 'tomato',
  pepperSeed: 'pepper',
  eggplantSeed: 'eggplant',
  strawberrySeed: 'strawberry',
  cabbageSeed: 'cabbage',
  pumpkinSeed: 'pumpkin',
};

/** 按累计生长秒数推导当前阶段(immatureSeconds 可覆盖未成熟→成熟时长,局外养成「良种」用) */
export function cropStageOf(spec: CropSpec, age: number, immatureSeconds = spec.immatureSeconds): CropStage {
  if (age < spec.sproutSeconds) return 0;
  if (age < spec.sproutSeconds + immatureSeconds) return 1;
  return 2;
}

/** 幼苗阶段的单株建模(播种预览/手持模型共用:一小丛刚冒头的绿芽) */
export function makeCropSproutPreview(kind: CropKind): THREE.Group {
  return CROP_MESH_MAKERS[kind](0, 0, 0);
}

/** 场景中的一株作物:种在土壤格上,按累计生长秒数切换幼苗/未成熟/成熟三阶段模型 */
export class Crop {
  readonly group: THREE.Group;
  private stageMesh: THREE.Group | null = null;
  private stage: CropStage = 0;
  /** 随风轻摆的相位(纯表现,各端本地随机即可) */
  readonly swayPhase = Math.random() * Math.PI * 2;

  constructor(
    scene: THREE.Scene,
    readonly spec: CropSpec,
    readonly position: THREE.Vector3,
    private age: number,
    private immatureSeconds: number = spec.immatureSeconds
  ) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);
    this.applyStage(cropStageOf(spec, age, this.immatureSeconds));
  }

  /** 累计生长秒数(存档/快照字段) */
  get grown(): number {
    return this.age;
  }

  /** 当前生长阶段 */
  get currentStage(): CropStage {
    return this.stage;
  }

  get mature(): boolean {
    return this.stage === 2;
  }

  /** 推进生长:跨过阶段阈值时重建对应阶段的模型 */
  grow(delta: number): void {
    this.age += delta;
    this.applyStage(cropStageOf(this.spec, this.age, this.immatureSeconds));
  }

  private applyStage(stage: CropStage): void {
    if (stage === this.stage && this.stageMesh) return;
    this.stage = stage;
    if (this.stageMesh) this.group.remove(this.stageMesh);
    this.stageMesh = CROP_MESH_MAKERS[this.spec.kind](stage, this.position.x, this.position.z);
    this.group.add(this.stageMesh);
  }
}

/** 作物存档/联机快照:grown 为累计生长秒数(只在游戏内累计,离线不快进);
 * 联机时客人本地同样累计,快照增量仅在小漂移超容差时柔和对齐 */
export type CropSave = {
  id?: string;
  kind: CropKind;
  x: number;
  y: number;
  z: number;
  grown: number;
};
