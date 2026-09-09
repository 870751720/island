import * as THREE from 'three';
import type { ResourceKind } from '../systems/Inventory';

export type CropKind = 'carrot' | 'wheat';

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
  },
  wheat: {
    kind: 'wheat',
    name: '小麦',
    seed: 'wheatSeed',
    product: 'wheat',
    sproutSeconds: 120,
    immatureSeconds: 120,
    yieldCount: 2,
  },
};

/** 种子道具 → 作物种类的映射(播种入口用) */
export const CROP_OF_SEED: Partial<Record<ResourceKind, CropKind>> = {
  carrotSeed: 'carrot',
  wheatSeed: 'wheat',
};

/** 按累计生长秒数推导当前阶段 */
export function cropStageOf(spec: CropSpec, age: number): CropStage {
  if (age < spec.sproutSeconds) return 0;
  if (age < spec.sproutSeconds + spec.immatureSeconds) return 1;
  return 2;
}

function cropMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 按落点取 0-1 的确定性伪随机(与土壤的土坷垃同款,读档/联机重放不漂移) */
function cellRandom(x: number, z: number, i: number): number {
  const v = Math.sin(x * 127.1 + z * 311.7 + i * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

/** 一片叶片:绕自身倾斜的扁片,从根部散开 */
function leaf(color: string, len: number, tilt: number, rotY: number): THREE.Group {
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.035, len, 4), cropMaterial(color));
  m.position.y = len / 2;
  m.rotation.z = tilt;
  const pivot = new THREE.Group();
  pivot.rotation.y = rotY;
  pivot.add(m);
  return pivot;
}

/** 沿三道土垄各摆一丛植株,坐标按落点伪随机散布(与土壤质感呼应) */
function plantSpots(x: number, z: number): THREE.Vector3[] {
  const spots: THREE.Vector3[] = [];
  for (let i = 0; i < 3; i++) {
    spots.push(
      new THREE.Vector3(cellRandom(x, z, i) * 0.3 - 0.15, 0.1, -1 / 3 + i / 3 + cellRandom(x, z, i + 3) * 0.08 - 0.04)
    );
  }
  return spots;
}

function makeCarrotMesh(stage: CropStage, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const leafColor = stage === 2 ? '#4a8a35' : '#5da345';
  for (const spot of plantSpots(x, z)) {
    const plant = new THREE.Group();
    plant.position.copy(spot);
    if (stage === 0) {
      plant.add(leaf(leafColor, 0.14, 0.35, 0), leaf(leafColor, 0.12, -0.3, 2.2));
    } else {
      const count = stage === 1 ? 4 : 6;
      const len = stage === 1 ? 0.22 : 0.3;
      for (let i = 0; i < count; i++) {
        plant.add(leaf(leafColor, len + cellRandom(x, z, i) * 0.06, 0.5 + (i % 3) * 0.15, (i / count) * Math.PI * 2));
      }
      // 成熟:橙色根茎顶出土面,一眼能看出该收了
      if (stage === 2) {
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.12, 6), cropMaterial('#e07b2a'));
        root.position.y = 0.04;
        plant.add(root);
      }
    }
    g.add(plant);
  }
  return g;
}

function makeWheatMesh(stage: CropStage, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const stalkColor = stage === 2 ? '#d9b45a' : '#7aa74e';
  for (const spot of plantSpots(x, z)) {
    const plant = new THREE.Group();
    plant.position.copy(spot);
    const count = stage === 0 ? 2 : stage === 1 ? 4 : 5;
    const len = stage === 0 ? 0.16 : stage === 1 ? 0.38 : 0.55;
    for (let i = 0; i < count; i++) {
      const stalk = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, len, 5), cropMaterial(stalkColor));
      stem.position.y = len / 2;
      stalk.add(stem);
      stalk.rotation.z = 0.08 + cellRandom(x, z, i) * 0.12;
      stalk.rotation.y = (i / count) * Math.PI * 2;
      // 未成熟抽出细长叶片,成熟换成饱满的麦穗
      if (stage === 1) {
        stalk.add(leaf('#7aa74e', 0.2, 0.55, 0.8));
      } else if (stage === 2) {
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 5), cropMaterial('#e8c56a'));
        head.position.y = len + 0.06;
        stalk.add(head);
        const awn = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 3), cropMaterial('#c9a441'));
        awn.position.y = len + 0.16;
        stalk.add(awn);
      }
      plant.add(stalk);
    }
    g.add(plant);
  }
  return g;
}

/** 幼苗阶段的单株建模(播种预览/手持模型共用:一小丛刚冒头的绿芽) */
export function makeCropSproutPreview(kind: CropKind): THREE.Group {
  return kind === 'carrot' ? makeCarrotMesh(0, 0, 0) : makeWheatMesh(0, 0, 0);
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
    private age: number
  ) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);
    this.applyStage(cropStageOf(spec, age));
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
    this.applyStage(cropStageOf(this.spec, this.age));
  }

  private applyStage(stage: CropStage): void {
    if (stage === this.stage && this.stageMesh) return;
    this.stage = stage;
    if (this.stageMesh) this.group.remove(this.stageMesh);
    this.stageMesh = this.spec.kind === 'carrot'
      ? makeCarrotMesh(stage, this.position.x, this.position.z)
      : makeWheatMesh(stage, this.position.x, this.position.z);
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
