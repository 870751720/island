import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { disposeOwnedMeshes } from '../core/disposeOwnedMeshes';
import type { WindParams } from '../systems/WeatherSystem';
import { IslandTerrain } from './IslandTerrain';
import {
  FRUIT_REGROW,
  GROWTH_CHANCE,
  TREE_MODEL_SCALE,
  type TreeSpecies,
  type TreeStage,
} from './TreeSpecies';
import { worldEntityKey, type WorldDeltaOp } from '../net/WorldDelta';
import { GmSystem } from '../systems/GmSystem';
import { createWorldEntityId, type EntityChangeSink } from '../systems/WorldEntityId';
import { generatePropSpots, type PropSpot } from './PropSpawner';
import { isPassage, landCells } from './SpawnLayout';

const SHAKE_TIME = 0.4;

/** 各类植被的风摇参数:幅度、频率(草最敏感,树最沉稳) */
const SWAY_CONFIG: Partial<Record<PropKind, { amp: number; freq: number }>> = {
  tree: { amp: 0.05, freq: 1.6 },
  grass: { amp: 0.14, freq: 3.5 },
  shrub: { amp: 0.04, freq: 2.2 },
  berry: { amp: 0.03, freq: 2.2 },
};

/** 有阻挡的物件的碰撞半径(树按树干算,大石按岩体算);未列出的种类可穿过 */
const BLOCK_RADIUS: Partial<Record<PropKind, number>> = {
  tree: 0.4,
  rock: 0.6,
  iron: 0.6,
  meteor: 0.6,
};

export type PropKind =
  | 'tree'
  | 'rock'
  | 'iron'
  | 'gravel'
  | 'berry'
  | 'shrub'
  | 'grass'
  | 'wormNest'
  | 'meteor';

/** 资源点的完整可序列化状态；布局由房主/存档直接持有。 */
export type PropState = {
  id?: string;
  kind: PropKind;
  ready: boolean;
  /** 再生剩余秒数;联机增量快照不含该字段(客人不模拟再生,由房主在再生完成时翻转 ready 同步) */
  regrowLeft?: number;
  stage?: 'full' | 'stump';
  species?: TreeSpecies;
  growth?: TreeStage;
  /** 果树是否挂果(仅果树用;缺省视为挂果,兼容旧档) */
  fruited?: boolean;
  /** 挂果再生剩余秒数 */
  fruitLeft?: number;
  x: number;
  z: number;
  rotationY: number;
};

/** 各类资源点的采集产出与再生时间(秒);regrow 为 0 表示不可再生 */
const PROP_CONFIG: Record<PropKind, { regrow: number }> = {
  tree: { regrow: 0 },
  rock: { regrow: 0 },
  iron: { regrow: 0 },
  gravel: { regrow: 0 },
  meteor: { regrow: 0 },
  berry: { regrow: 180 },
  shrub: { regrow: 180 },
  grass: { regrow: 180 },
  wormNest: { regrow: 240 },
};

export type Prop = {
  id: string;
  kind: PropKind;
  group: THREE.Group;
  position: THREE.Vector3;
  ready: boolean;
  regrowLeft: number;
  /** 树的砍伐阶段:full=完整树,stump=只剩树桩仍可砍 */
  stage?: 'full' | 'stump';
  /** 树种(自然生成的旧存档没有时按橡树处理) */
  species?: TreeSpecies;
  /** 树的生长阶段;仅成树可砍 */
  growth?: TreeStage;
  /** 果树当前是否挂果(undefined 视为挂果) */
  fruited?: boolean;
  /** 距离重新挂果的剩余秒数(仅果树摘果后使用) */
  fruitLeft?: number;
};

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
  });
}

/** 各树种的树冠配色 */
const CROWN_COLORS: Record<TreeSpecies, string> = {
  oak: '#3f7d33',
  pine: '#2e6b3d',
  fruit: '#4f8f3a',
};

/** 发芽:一根细茎顶着两片嫩叶 */
function makeSproutParts(): THREE.Mesh[] {
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.06, 0.42, 4),
    clayMaterial('#7fae55')
  );
  stem.position.y = 0.21;
  const leafL = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 4), clayMaterial('#a4c46a'));
  leafL.position.set(-0.1, 0.46, 0);
  leafL.rotation.z = 0.9;
  const leafR = leafL.clone();
  leafR.position.x = 0.1;
  leafR.rotation.z = -0.9;
  return [stem, leafL, leafR];
}

/** 小树:细瘦树干 + 稀疏的少量叶子,一眼能看出还没长成(按树种区分造型) */
function makeSaplingParts(species: TreeSpecies): THREE.Mesh[] {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.05, 0.7, 5),
    clayMaterial('#8a6239')
  );
  trunk.position.y = 0.35;
  if (species === 'pine') {
    // 松树苗:光杆上顶一个瘦小尖锥,不是成树的圆团
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.45, 6),
      clayMaterial(CROWN_COLORS.pine)
    );
    cone.position.y = 0.85;
    return [trunk, cone];
  }
  if (species === 'fruit') {
    // 果树苗:三片零散的小叶
    const leaves: [number, number, number, number][] = [
      // [半径, x, y, z]
      [0.16, 0, 0.75, 0],
      [0.12, 0.14, 0.88, 0.06],
      [0.1, -0.12, 0.82, -0.08],
    ];
    return [trunk, ...leaves.map(([r, x, y, z]) => {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), clayMaterial(CROWN_COLORS.fruit));
      leaf.position.set(x, y, z);
      return leaf;
    })];
  }
  // 橡树苗:两片错开的小叶
  const leafL = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.15, 0),
    clayMaterial(CROWN_COLORS.oak)
  );
  leafL.position.set(-0.08, 0.78, 0);
  const leafR = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.11, 0),
    clayMaterial('#4f9440')
  );
  leafR.position.set(0.11, 0.9, 0.06);
  return [trunk, leafL, leafR];
}

/** 成树:按树种拼装三种造型;果树按挂果状态决定是否点缀红果 */
function makeMatureParts(species: TreeSpecies, withFruit: boolean): THREE.Mesh[] {
  const trunkColor = '#8a6239';
  const crownColor = CROWN_COLORS[species];
  if (species === 'pine') {
    // 松树:细高树干 + 三层锥形树冠
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.13, 1.0, 5),
      clayMaterial(trunkColor)
    );
    trunk.position.y = 0.5;
    const tiers = [0.62, 0.46, 0.3];
    const crowns = tiers.map(
      (r, i) =>
        new THREE.Mesh(new THREE.ConeGeometry(r, 0.7 - i * 0.12, 6), clayMaterial(crownColor))
    );
    crowns[0].position.y = 0.85;
    crowns[1].position.y = 1.25;
    crowns[2].position.y = 1.6;
    return [trunk, ...crowns];
  }
  if (species === 'fruit') {
    // 果树:矮壮树干顶着一大团圆树冠,冠上点缀红果
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.16, 1.1, 5),
      clayMaterial(trunkColor)
    );
    trunk.position.y = 0.55;
    const parts: THREE.Mesh[] = [trunk];
    const crownColor = CROWN_COLORS.fruit;
    const blobs: [number, number, number, number][] = [
      // [半径, x, y, z]
      [0.62, 0, 1.5, 0],
      [0.5, 0.42, 1.62, 0.15],
      [0.48, -0.38, 1.58, -0.12],
      [0.45, 0.05, 1.85, 0.35],
    ];
    for (const [r, x, y, z] of blobs) {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), clayMaterial(crownColor));
      blob.position.set(x, y, z);
      parts.push(blob);
    }
    if (!withFruit) return parts;
    const fruitMat = clayMaterial('#c0392b');
    const fruits: [number, number, number][] = [
      [0.55, 1.35, 0.2],
      [-0.45, 1.5, 0.1],
      [0.1, 1.95, 0.3],
      [0.3, 1.7, -0.4],
      [-0.15, 1.4, -0.45],
      [0.6, 1.6, 0.35],
      [-0.5, 1.72, 0.32],
      [0.42, 1.32, -0.28],
      [-0.25, 1.85, -0.15],
      [0.18, 1.55, 0.5],
      [0.65, 1.45, -0.12],
      [-0.62, 1.42, -0.25],
    ];
    for (const [x, y, z] of fruits) {
      const fruit = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), fruitMat);
      fruit.position.set(x, y, z);
      parts.push(fruit);
    }
    return parts;
  }
  // 橡树:矮壮树干 + 两团圆树冠
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.9, 5),
    clayMaterial(trunkColor)
  );
  trunk.position.y = 0.45;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 0), clayMaterial(crownColor));
  crown.position.y = 1.2;
  const crown2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 0),
    clayMaterial('#4f9440')
  );
  crown2.position.set(0.15, 1.65, 0.1);
  return [trunk, crown, crown2];
}

/** 树桩:一截短树干 */
function makeStumpParts(): THREE.Mesh[] {
  const stump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.19, 0.28, 5),
    clayMaterial('#8a6239')
  );
  stump.position.y = 0.14;
  return [stump];
}

function makeRock(): THREE.Group {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.55, 0),
    clayMaterial('#8a8a8a')
  );
  rock.scale.set(1, 0.85, 0.9);
  rock.position.y = 0.4;
  rock.castShadow = true;
  g.add(rock);
  return g;
}

/** 陨石:暗色岩体半埋入地,表面嵌着几粒发亮的灼热碎屑 */
function makeMeteor(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.55, 0),
    clayMaterial('#4a4650')
  );
  body.scale.set(1.05, 0.7, 0.95);
  body.rotation.set(0.3, 0.6, 0.15);
  body.position.y = 0.28;
  body.castShadow = true;
  g.add(body);
  const emberMat = new THREE.MeshStandardMaterial({
    color: '#e8703a',
    emissive: '#c0392b',
    emissiveIntensity: 0.8,
    flatShading: true,
    roughness: 1,
  });
  const embers: [number, number, number][] = [
    [0.32, 0.42, 0.18],
    [-0.28, 0.34, 0.3],
    [0.05, 0.5, -0.38],
    [-0.15, 0.2, 0.48],
  ];
  for (const [x, y, z] of embers) {
    const ember = new THREE.Mesh(new THREE.TetrahedronGeometry(0.1, 0), emberMat);
    ember.position.set(x, y, z);
    g.add(ember);
  }
  return g;
}

/** 铁矿:整体锈红的岩体,嵌着深灰的金属矿块(与灰色石矿一眼区分) */
function makeIron(): THREE.Group {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.55, 0),
    clayMaterial('#a5623f')
  );
  rock.scale.set(1, 0.85, 0.9);
  rock.position.y = 0.4;
  rock.castShadow = true;
  g.add(rock);
  const oreMat = clayMaterial('#4d5560');
  const bits: [number, number, number][] = [
    [0.3, 0.5, 0.22],
    [-0.35, 0.42, 0.18],
    [0.08, 0.62, -0.3],
    [-0.18, 0.3, 0.45],
    [0.42, 0.32, -0.2],
  ];
  for (const [x, y, z] of bits) {
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.14), oreMat);
    bit.position.set(x, y, z);
    bit.rotation.set(0.4, 0.8, 0.2);
    g.add(bit);
  }
  return g;
}

function makeGravel(): THREE.Group {
  const g = new THREE.Group();
  const mat = clayMaterial('#b5b0a8');
  for (let i = 0; i < 4; i++) {
    const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), mat);
    pebble.position.set(
      Math.cos((i / 4) * Math.PI * 2) * 0.25,
      0.1,
      Math.sin((i / 4) * Math.PI * 2) * 0.25
    );
    pebble.castShadow = true;
    g.add(pebble);
  }
  return g;
}

function makeBushBody(color: string): { group: THREE.Group; body: THREE.Mesh } {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), clayMaterial(color));
  body.position.y = 0.28;
  body.castShadow = true;
  group.add(body);
  return { group, body };
}

function makeBerryBush(): { group: THREE.Group; berries: THREE.Mesh[] } {
  const { group } = makeBushBody('#5d8a3a');
  const berryMat = clayMaterial('#c0392b');
  const berries: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const berry = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), berryMat);
    const a = (i / 4) * Math.PI * 2;
    berry.position.set(Math.cos(a) * 0.28, 0.38, Math.sin(a) * 0.28);
    berries.push(berry);
    group.add(berry);
  }
  return { group, berries };
}

function makeGrassTuft(): THREE.Group {
  // 草丛:几片交叉的细长叶片,产出植物纤维
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.45, 3),
      clayMaterial(i % 2 === 0 ? '#7fae55' : '#a4c46a')
    );
    const a = (i / 6) * Math.PI * 2 + 0.4;
    blade.position.set(Math.cos(a) * 0.12, 0.22, Math.sin(a) * 0.12);
    blade.rotation.set(Math.sin(a) * 0.35, a, -Math.cos(a) * 0.35);
    blade.castShadow = true;
    g.add(blade);
  }
  return g;
}

function makeShrub(): THREE.Group {
  // 灌木丛:多团叶子,产出树枝
  const g = new THREE.Group();
  const mat = clayMaterial('#6b8f4e');
  for (let i = 0; i < 3; i++) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), mat);
    const a = (i / 3) * Math.PI * 2;
    blob.position.set(Math.cos(a) * 0.18, 0.2 + (i % 2) * 0.1, Math.sin(a) * 0.18);
    blob.castShadow = true;
    g.add(blob);
  }
  return g;
}

/** 蚯蚓窝:湿土堆成的小丘,顶上有个小洞,有蚯蚓时洞口只横躺着一只蚯蚓 */
function makeWormNest(): { group: THREE.Group; worm: THREE.Group } {
  const group = new THREE.Group();
  const mound = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.2, 1),
    clayMaterial('#6f5a44')
  );
  mound.scale.set(1.15, 0.45, 1.05);
  mound.position.y = 0.08;
  mound.castShadow = true;
  group.add(mound);
  // 洞口:一小片更深的湿土
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.075, 0.04, 6),
    clayMaterial('#4a3a2c')
  );
  hole.position.y = 0.17;
  group.add(hole);
  // 横躺在洞口的唯一一只蚯蚓
  const worm = new THREE.Group();
  const mat = clayMaterial('#d98a8a');
  const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.09, 2, 5), mat);
  seg.rotation.z = Math.PI / 2;
  seg.position.y = 0.03;
  worm.add(seg);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.06, 2, 5), mat);
  tail.rotation.z = Math.PI / 2 + 0.5;
  tail.position.set(-0.08, 0.025, 0.015);
  worm.add(tail);
  worm.position.y = 0.17;
  worm.rotation.y = 0.7;
  group.add(worm);
  return { group, worm };
}

/** 岛上散布的资源点,管理采集后的外观变化、再生与树的生长 */
export class Props implements Updatable {
  readonly list: Prop[] = [];
  private berries = new Map<Prop, THREE.Mesh[]>();
  /** 各蚯蚓窝洞口的那只蚯蚓模型(有蚯蚓状态才可见) */
  private nestWorms = new Map<Prop, THREE.Object3D>();
  private shakes = new Map<Prop, number>();
  private treeLooks = new WeakMap<Prop, string>();
  private growthTimer = 0;
  private swayTime = 0;
  private onChanged?: EntityChangeSink;

  // —— 空间哈希网格:资源数量随岛面积增长后,碰撞/占位查询不再全表扫描 ——
  private static readonly GRID_CELL = 8;
  private grid = new Map<number, Prop[]>();

  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    generate = true,
    rng: () => number = Math.random
  ) {
    if (!generate) return;
    for (const spot of generatePropSpots(terrain, rng)) this.createWildProp(spot, rng);
  }

  /** 按撒点结果创建一个自然资源(仅初始生成用,不触发联机增量) */
  private createWildProp(spot: PropSpot, rng: () => number): void {
    const { kind, x, z } = spot;
    const y = this.terrain.getHeight(x, z);
    let berries: THREE.Mesh[] | null = null;
    let nestWorm: THREE.Object3D | null = null;
    let group: THREE.Group;
    if (kind === 'tree') group = new THREE.Group();
    else if (kind === 'rock') group = makeRock();
    else if (kind === 'iron') group = makeIron();
    else if (kind === 'gravel') group = makeGravel();
    else if (kind === 'shrub') group = makeShrub();
    else if (kind === 'grass') group = makeGrassTuft();
    else if (kind === 'wormNest') {
      const made = makeWormNest();
      group = made.group;
      nestWorm = made.worm;
    } else {
      const made = makeBerryBush();
      group = made.group;
      berries = made.berries;
    }
    group.position.set(x, y - 0.05, z);
    group.rotation.y = rng() * Math.PI * 2;
    this.scene.add(group);
    const prop: Prop = {
      id: createWorldEntityId('prop'),
      kind,
      group,
      position: group.position.clone(),
      ready: true,
      regrowLeft: 0,
    };
    if (kind === 'tree') {
      // 岛上的树分三种,按纬度分布,自然生成的都是成树
      prop.species = spot.species ?? 'oak';
      prop.growth = 'mature';
      this.applyTreeLook(prop);
    }
    this.addProp(prop);
    if (berries) this.berries.set(prop, berries);
    if (nestWorm) this.nestWorms.set(prop, nestWorm);
  }

  /** 玩家种下一棵树:在落点生成发芽阶段的树并纳入管理 */
  plant(species: TreeSpecies, x: number, z: number): Prop {
    const y = this.terrain.getHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, y - 0.05, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    const prop: Prop = {
      id: createWorldEntityId('prop'),
      kind: 'tree',
      group,
      position: group.position.clone(),
      ready: false,
      regrowLeft: 0,
      stage: 'full',
      species,
      growth: 'sprout',
    };
    this.applyTreeLook(prop);
    this.addProp(prop);
    this.onChanged?.({ op: 'add', id: prop.id, value: this.stateOf(prop) as unknown as Record<string, unknown> });
    return prop;
  }

  /** 自然补种的目标间距:离最近的树太近会挤成密林,太远则落在光秃地上 */
  private static readonly SEED_TARGET_SPACING = 6;
  /** 补种点与玩家的最小距离,避免树苗当着玩家的面凭空出现 */
  private static readonly SEED_PLAYER_CLEARANCE = 18;

  /**
   * 自然补种:玩家每砍倒一棵成树,房主端在岛上另选一处播下同树种种子(发芽阶段)。
   * 选点采样干地格子,排除水边/通道/被占位置与所有玩家周围,再按「与最近树的距离
   * 最接近目标间距」打分取最优,使补种既不加密密林也不落在光秃地上。
   */
  seedRegrowTree(species: TreeSpecies, avoidPlayers: readonly THREE.Vector3[]): void {
    const cells = landCells(this.terrain);
    if (!cells.length) return;
    const trees = this.list.filter((prop) => prop.kind === 'tree' && prop.group.visible);
    const p = new THREE.Vector3();
    let best: { x: number; z: number; score: number } | null = null;
    for (let i = 0; i < 80; i++) {
      const c = cells[Math.floor(Math.random() * cells.length)];
      if (!c) break;
      const x = c.x + (Math.random() - 0.5) * 4;
      const z = c.z + (Math.random() - 0.5) * 4;
      p.set(x, this.terrain.getHeight(x, z), z);
      if (p.y <= 0.3 || this.terrain.isNearWater(p, 1)) continue;
      if (isPassage(x, z)) continue;
      if (this.isOccupied(p, 2)) continue;
      if (avoidPlayers.some((a) => Math.hypot(x - a.x, z - a.z) < Props.SEED_PLAYER_CLEARANCE)) continue;
      const nearest = trees.reduce(
        (min, t) => Math.min(min, Math.hypot(x - t.position.x, z - t.position.z)),
        Infinity
      );
      const score = -Math.abs(nearest - Props.SEED_TARGET_SPACING);
      if (!best || score > best.score) best = { x, z, score };
    }
    if (best) this.plant(species, best.x, best.z);
  }

  /** 落下一颗陨石:在落点生成可采集的陨石资源点(产出同岩石) */
  placeMeteor(x: number, z: number): Prop {
    const y = this.terrain.getHeight(x, z);
    const group = makeMeteor();
    group.position.set(x, y - 0.05, z);
    this.scene.add(group);
    const prop: Prop = {
      id: createWorldEntityId('prop'),
      kind: 'meteor',
      group,
      position: group.position.clone(),
      ready: true,
      regrowLeft: 0,
    };
    this.addProp(prop);
    this.onChanged?.({ op: 'add', id: prop.id, value: this.stateOf(prop) as unknown as Record<string, unknown> });
    return prop;
  }

  /** 玩家放下一株挖来的丛:在落点生成可采集/可再挖的丛并纳入管理 */
  placeBush(kind: 'berry' | 'shrub' | 'grass', x: number, z: number): Prop {
    const y = this.terrain.getHeight(x, z);
    let berries: THREE.Mesh[] | null = null;
    let group: THREE.Group;
    if (kind === 'berry') {
      const made = makeBerryBush();
      group = made.group;
      berries = made.berries;
    } else if (kind === 'grass') {
      group = makeGrassTuft();
    } else {
      group = makeShrub();
    }
    group.position.set(x, y - 0.05, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    const prop: Prop = {
      id: createWorldEntityId('prop'),
      kind,
      group,
      position: group.position.clone(),
      // 刚种下的丛不处于可采集状态,需过一个再生周期恢复
      ready: false,
      regrowLeft: PROP_CONFIG[kind].regrow,
    };
    this.addProp(prop);
    if (berries) this.berries.set(prop, berries);
    this.syncAppearance(prop);
    this.onChanged?.({ op: 'add', id: prop.id, value: this.stateOf(prop) as unknown as Record<string, unknown> });
    return prop;
  }

  /** 玩家放下一窝挖来的蚯蚓窝:刚放下时没有蚯蚓,过一个再生周期才有 */
  placeWormNest(x: number, z: number): Prop {
    const y = this.terrain.getHeight(x, z);
    const { group, worm } = makeWormNest();
    group.position.set(x, y - 0.05, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    const prop: Prop = {
      id: createWorldEntityId('prop'),
      kind: 'wormNest',
      group,
      position: group.position.clone(),
      ready: false,
      regrowLeft: PROP_CONFIG.wormNest.regrow,
    };
    this.addProp(prop);
    this.nestWorms.set(prop, worm);
    this.syncAppearance(prop);
    this.onChanged?.({ op: 'add', id: prop.id, value: this.stateOf(prop) as unknown as Record<string, unknown> });
    return prop;
  }

  /** 旧档补撒野生蚯蚓窝:改版前蚯蚓是不入档的环境生物,老档里没有蚯蚓窝资源点 */
  seedWildWormNests(): void {
    if (this.list.some((prop) => prop.kind === 'wormNest')) return;
    const cells = landCells(this.terrain);
    const target = Math.max(4, Math.round((cells.length * 16 * 7) / 10000));
    for (let i = 0; i < target * 20 && this.list.filter((prop) => prop.kind === 'wormNest').length < target; i++) {
      const c = cells[Math.floor(Math.random() * cells.length)];
      if (!c) break;
      const x = c.x + (Math.random() - 0.5) * 4;
      const z = c.z + (Math.random() - 0.5) * 4;
      const y = this.terrain.getHeight(x, z);
      const p = new THREE.Vector3(x, y, z);
      if (y <= 0.3 || this.terrain.isNearWater(p, 1)) continue;
      if (!this.terrain.waterAreas.some((w) => Math.hypot(x - w.x, z - w.z) < w.radius + 18)) continue;
      if (this.isOccupied(p, 1)) continue;
      const spot: PropSpot = { kind: 'wormNest', x, z };
      this.createWildProp(spot, Math.random);
    }
  }


  removeProp(prop: Prop): void {
    this.dropProp(prop);
    this.scene.remove(prop.group);
    disposeOwnedMeshes(prop.group);
    this.treeLooks.delete(prop);
    this.berries.delete(prop);
    this.nestWorms.delete(prop);
    this.shakes.delete(prop);
    this.onChanged?.({ op: 'remove', id: prop.id });
  }

  private gridKey(x: number, z: number): number {
    const cx = Math.floor(x / Props.GRID_CELL) + 2048;
    const cz = Math.floor(z / Props.GRID_CELL) + 2048;
    return cx * 4096 + cz;
  }

  private addProp(prop: Prop): void {
    this.list.push(prop);
    const key = this.gridKey(prop.position.x, prop.position.z);
    const cell = this.grid.get(key);
    if (cell) cell.push(prop);
    else this.grid.set(key, [prop]);
  }

  private dropProp(prop: Prop): void {
    const index = this.list.indexOf(prop);
    if (index >= 0) this.list.splice(index, 1);
    const cell = this.grid.get(this.gridKey(prop.position.x, prop.position.z));
    if (!cell) return;
    const i = cell.indexOf(prop);
    if (i >= 0) cell.splice(i, 1);
    if (cell.length === 0) this.grid.delete(this.gridKey(prop.position.x, prop.position.z));
  }

  /** 查询点所在格子及周边一圈格子内的资源(格子 8 米,足够覆盖最大阻挡半径) */
  private nearby(x: number, z: number): Prop[] {
    const cell = Props.GRID_CELL;
    const cx = Math.floor(x / cell);
    const cz = Math.floor(z / cell);
    const out: Prop[] = [];
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const propsInCell = this.grid.get((cx + i + 2048) * 4096 + (cz + j + 2048));
        if (propsInCell) out.push(...propsInCell);
      }
    }
    return out;
  }

  /** 落点附近是否有占位的资源点(被挖走的不算) */
  isOccupied(p: THREE.Vector3, range: number): boolean {
    return this.nearby(p.x, p.z).some((prop) => prop.position.distanceTo(p) < range);
  }

  /** 按生长阶段/砍伐阶段重建树的外观(整体替换子网格) */
  private applyTreeLook(prop: Prop): void {
    const fruited = prop.species === 'fruit' && prop.fruited !== false;
    const look = prop.stage === 'stump'
      ? 'stump'
      : `${prop.growth ?? 'mature'}:${prop.species ?? 'oak'}:${prop.growth === 'mature' ? (fruited ? 1 : 0) : '-'}`;
    if (this.treeLooks.get(prop) === look) return;
    disposeOwnedMeshes(prop.group);
    prop.group.clear();
    const parts =
      prop.stage === 'stump'
        ? makeStumpParts()
        : prop.growth === 'sprout'
          ? makeSproutParts()
          : prop.growth === 'sapling'
            ? makeSaplingParts(prop.species ?? 'oak')
            : makeMatureParts(prop.species ?? 'oak', fruited);
    for (const part of parts) {
      part.castShadow = true;
      prop.group.add(part);
    }
    prop.group.scale.setScalar(TREE_MODEL_SCALE);
    this.treeLooks.set(prop, look);
  }

  /** 摘果:摘走果树当前全部挂果,进入 3 分钟挂果再生;树本身保持可砍 */
  pickFruit(prop: Prop): void {
    prop.fruited = false;
    prop.fruitLeft = FRUIT_REGROW;
    this.applyTreeLook(prop);
    this.onChanged?.({ op: 'set', id: prop.id, fields: { fruited: false } });
  }

  /** 采集后的外观变化,并按配置安排再生 */
  harvest(prop: Prop): void {
    prop.ready = false;
    const { regrow } = PROP_CONFIG[prop.kind];
    if (regrow > 0) {
      prop.regrowLeft = regrow;
    }
    if (prop.kind === 'tree' && prop.stage !== 'stump' && prop.growth === 'mature') {
      // 成树第一段砍掉树冠只留树桩,树桩仍可继续砍
      prop.stage = 'stump';
      prop.ready = true;
    }
    this.syncAppearance(prop);
    this.onChanged?.({ op: 'set', id: prop.id, fields: { ready: prop.ready, stage: prop.stage } });
  }

  /** 依据 ready/stage/growth 同步采集后的外观(树桩保留,其余隐藏或缩形) */
  private syncAppearance(prop: Prop): void {
    switch (prop.kind) {
      case 'tree':
        this.applyTreeLook(prop);
        // 发芽与小树始终可见;成树被砍倒(砍桩后)整体隐藏
        prop.group.visible = prop.growth !== 'mature' || prop.ready;
        break;
      case 'rock':
      case 'iron':
      case 'meteor':
      case 'gravel':
        prop.group.visible = prop.ready;
        break;
      case 'berry':
        // 浆果丛保留,只藏起果子
        for (const berry of this.berries.get(prop) ?? []) berry.visible = prop.ready;
        break;
      case 'grass':
        // 草丛被采后缩成一小茬,表示草还在
        prop.group.scale.setScalar(prop.ready ? 1 : 0.3);
        break;
      case 'shrub':
        // 灌木丛被割后缩成小桩
        prop.group.scale.setScalar(prop.ready ? 1 : 0.35);
        break;
      case 'wormNest': {
        // 窝保留,只是洞口的蚯蚓被捉走了
        const worm = this.nestWorms.get(prop);
        if (worm) worm.visible = prop.ready;
        break;
      }
    }
  }

  /** 当前全部资源点完整快照；自然资源和玩家放置资源一律带落点。 */
  snapshot(): PropState[] {
    return this.list.map((prop) => this.stateOf(prop));
  }

  private stateOf(prop: Prop): PropState {
      const state: PropState = {
        id: prop.id,
        kind: prop.kind,
        ready: prop.ready,
        regrowLeft: prop.regrowLeft,
        stage: prop.stage,
        x: prop.position.x,
        z: prop.position.z,
        rotationY: prop.group.rotation.y,
      };
      if (prop.kind === 'tree') {
        state.species = prop.species;
        state.growth = prop.growth;
        state.fruited = prop.fruited;
        state.fruitLeft = prop.fruitLeft;
      }
      return state;
  }

  /** 从房主快照/存档恢复：按稳定 id 对账，未变化资源保留原模型。 */
  applySave(states: PropState[]): void {
    const incomingIds = new Set(states.flatMap((state) => state.id ? [state.id] : []));
    for (const prop of [...this.list]) {
      if (!incomingIds.has(prop.id)) this.removeProp(prop);
    }
    for (const state of states) {
      // 旧存档里的蚯蚓土坑已随「蚯蚓生物」改版移除,直接丢弃
      if ((state.kind as string) === 'worm') continue;
      const existing = state.id ? this.list.find((prop) => prop.id === state.id) : undefined;
      if (existing) {
        existing.ready = state.ready;
        existing.regrowLeft = state.regrowLeft ?? existing.regrowLeft;
        existing.stage = state.stage;
        existing.species = state.species;
        existing.growth = state.growth;
        existing.fruited = state.fruited;
        existing.fruitLeft = state.fruitLeft ?? 0;
        existing.group.rotation.y = state.rotationY;
        this.syncAppearance(existing);
        continue;
      }
      if (state.kind === 'meteor') {
        const prop = this.placeMeteor(state.x, state.z);
        prop.id = state.id ?? prop.id;
        prop.id = state.id ?? createWorldEntityId('prop');
        prop.ready = state.ready;
        prop.group.rotation.y = state.rotationY;
        this.syncAppearance(prop);
        continue;
      }
      if (state.kind === 'berry' || state.kind === 'shrub' || state.kind === 'grass') {
        const prop = this.placeBush(state.kind, state.x, state.z);
        prop.id = state.id ?? prop.id;
        prop.id = state.id ?? createWorldEntityId('prop');
        prop.ready = state.ready;
        prop.regrowLeft = state.regrowLeft ?? 0;
        prop.group.rotation.y = state.rotationY;
        this.syncAppearance(prop);
        continue;
      }
      if (state.kind === 'wormNest') {
        const prop = this.placeWormNest(state.x, state.z);
        prop.id = state.id ?? prop.id;
        prop.ready = state.ready;
        prop.regrowLeft = state.regrowLeft ?? 0;
        prop.group.rotation.y = state.rotationY;
        this.syncAppearance(prop);
        continue;
      }
      if (state.kind === 'tree') {
        const prop = this.plant(state.species ?? 'oak', state.x, state.z);
        prop.id = state.id ?? prop.id;
        prop.id = state.id ?? createWorldEntityId('prop');
        prop.ready = state.ready;
        prop.regrowLeft = state.regrowLeft ?? 0;
        prop.stage = state.stage;
        prop.growth = state.growth ?? 'mature';
        prop.fruited = state.fruited;
        prop.fruitLeft = state.fruitLeft ?? 0;
        prop.group.rotation.y = state.rotationY;
        // 未成树一律不可砍,兼容旧档里小树已写入的 ready
        if (prop.growth !== 'mature') prop.ready = false;
        this.syncAppearance(prop);
        continue;
      }
      const y = this.terrain.getHeight(state.x, state.z);
      const group = state.kind === 'rock' ? makeRock() : state.kind === 'iron' ? makeIron() : makeGravel();
      group.position.set(state.x, y - 0.05, state.z);
      group.rotation.y = state.rotationY;
      this.scene.add(group);
      const prop: Prop = {
        id: state.id ?? createWorldEntityId('prop'),
        kind: state.kind,
        group,
        position: group.position.clone(),
        ready: state.ready,
        regrowLeft: state.regrowLeft ?? 0,
      };
      this.addProp(prop);
      this.syncAppearance(prop);
    }
  }

  /** 联机字段增量：普通采集/再生只改原实体状态，不销毁或重建模型。 */
  applyNetDelta(ops: readonly WorldDeltaOp[]): boolean {
    if (ops.some((op) => op.section !== 'props' || op.op !== 'set')) return false;
    for (const op of ops) {
      if (op.op !== 'set') return false;
      const prop = this.list.find((item) => worldEntityKey('props', {
        id: item.id,
        kind: item.kind,
        x: item.position.x,
        z: item.position.z,
      }) === op.key);
      if (!prop) return false;
      if ('ready' in op.fields && typeof op.fields.ready === 'boolean') prop.ready = op.fields.ready;
      if ('stage' in op.fields) prop.stage = op.fields.stage as Prop['stage'];
      if ('growth' in op.fields) prop.growth = op.fields.growth as Prop['growth'];
      if ('fruited' in op.fields && typeof op.fields.fruited === 'boolean') {
        prop.fruited = op.fields.fruited;
        prop.fruitLeft = prop.fruited ? 0 : FRUIT_REGROW;
      }
      if ('species' in op.fields) prop.species = op.fields.species as Prop['species'];
      if ('rotationY' in op.fields && typeof op.fields.rotationY === 'number') {
        prop.group.rotation.y = op.fields.rotationY;
      }
      this.syncAppearance(prop);
    }
    return true;
  }

  dispose(): void {
    for (const prop of this.list.splice(0)) {
      this.scene.remove(prop.group);
      disposeOwnedMeshes(prop.group);
    }
    this.treeLooks = new WeakMap();
    this.grid.clear();
    this.berries.clear();
    this.nestWorms.clear();
    this.shakes.clear();
  }

  /** 物件的阻挡半径(成树、树桩与大石),不阻挡的返回 0 */
  private blockRadiusOf(prop: Prop): number {
    const blockR = BLOCK_RADIUS[prop.kind];
    // 幼树不阻挡;树被砍倒(整体隐藏)或大石被采空后不再阻挡;树桩仍阻挡
    if (prop.kind === 'tree' && prop.growth !== 'mature' && prop.stage !== 'stump') return 0;
    if (!blockR || !prop.group.visible) return 0;
    return blockR;
  }

  /** 将圆形实体沿 XZ 推出有阻挡的物件(成树、树桩与大石),原地修改位置 */
  resolveCollision(p: THREE.Vector3, radius: number): void {
    for (const prop of this.nearby(p.x, p.z)) {
      const blockR = this.blockRadiusOf(prop);
      if (!blockR) continue;
      const dx = p.x - prop.position.x;
      const dz = p.z - prop.position.z;
      const min = blockR + radius;
      if (dx * dx + dz * dz >= min * min) continue;
      const d = Math.max(Math.sqrt(dx * dx + dz * dz), 1e-4);
      const push = (min - d) / d;
      p.x += dx * push;
      p.z += dz * push;
    }
  }

  /** 动物绕行判定:点在任一有阻挡物件的半径内即视为不可走 */
  isBlocked(x: number, z: number, radius = 0.3): boolean {
    for (const prop of this.nearby(x, z)) {
      const blockR = this.blockRadiusOf(prop);
      if (!blockR) continue;
      const dx = x - prop.position.x;
      const dz = z - prop.position.z;
      const min = blockR + radius;
      if (dx * dx + dz * dz < min * min) return true;
    }
    return false;
  }

  /** 命中时的受击晃动,持续衰减 */
  shake(prop: Prop): void {
    this.shakes.set(prop, SHAKE_TIME);
  }

  update(delta: number, _elapsed?: number, wind?: WindParams, authoritative = true): void {
    if (authoritative) this.updateFruitRegrow(delta);
    for (const prop of authoritative ? this.list : []) {
      if (prop.ready || prop.regrowLeft <= 0) continue;
      prop.regrowLeft -= delta;
      if (prop.regrowLeft > 0) continue;
      prop.ready = true;
      prop.regrowLeft = 0;
      this.onChanged?.({ op: 'set', id: prop.id, fields: { ready: true } });
      if (prop.kind === 'berry') {
        for (const berry of this.berries.get(prop) ?? []) berry.visible = true;
      } else if (prop.kind === 'grass') {
        prop.group.scale.setScalar(1);
      } else if (prop.kind === 'shrub') {
        prop.group.scale.setScalar(1);
      } else if (prop.kind === 'wormNest') {
        this.syncAppearance(prop);
      }
    }
    if (authoritative) this.updateTreeGrowth(delta);
    for (const [prop, left] of this.shakes) {
      const t = left - delta;
      if (t <= 0) {
        prop.group.rotation.x = 0;
        prop.group.rotation.z = 0;
        this.shakes.delete(prop);
        continue;
      }
      this.shakes.set(prop, t);
      const amp = (t / SHAKE_TIME) * 0.06;
      prop.group.rotation.x = Math.sin(t * 40) * amp;
      prop.group.rotation.z = Math.cos(t * 34) * amp * 0.7;
    }
    this.updateSway(delta, wind);
  }

  /** 时间快进(睡觉跳到第二天):推进资源点再生与种下的树生长,不做击打/摇摆等表现 */
  advance(seconds: number): void {
    this.updateFruitRegrow(seconds);
    for (const prop of this.list) {
      if (prop.ready || prop.regrowLeft <= 0) continue;
      prop.regrowLeft = Math.max(0, prop.regrowLeft - seconds);
      if (prop.regrowLeft > 0) continue;
      prop.ready = true;
      this.onChanged?.({ op: 'set', id: prop.id, fields: { ready: true } });
      if (prop.kind === 'berry') {
        for (const berry of this.berries.get(prop) ?? []) berry.visible = true;
      } else if (prop.kind === 'grass') {
        prop.group.scale.setScalar(1);
      } else if (prop.kind === 'shrub') {
        prop.group.scale.setScalar(1);
      } else if (prop.kind === 'wormNest') {
        this.syncAppearance(prop);
      }
    }
    this.updateTreeGrowth(seconds);
  }

  /** 植被随风摇摆:按位置沿风向的相位差形成波浪扫过感,被击晃动时跳过 */
  private updateSway(delta: number, wind?: WindParams): void {
    const intensity = wind?.intensity ?? 0;
    const dirX = wind?.dirX ?? 0;
    const dirZ = wind?.dirZ ?? 0;
    for (const prop of this.list) {
      const cfg = SWAY_CONFIG[prop.kind];
      if (!cfg || !prop.group.visible || this.shakes.has(prop)) continue;
      // 树桩贴地,不摇
      if (prop.kind === 'tree' && prop.stage === 'stump') continue;
      if (intensity < 0.02) {
        if (prop.group.rotation.x !== 0 || prop.group.rotation.z !== 0) {
          prop.group.rotation.x = 0;
          prop.group.rotation.z = 0;
        }
        continue;
      }
      const phase = (prop.position.x * dirX + prop.position.z * dirZ) * 0.8;
      const tilt = cfg.amp * intensity * Math.sin(this.swayTime * cfg.freq + phase);
      prop.group.rotation.x = tilt * dirZ;
      prop.group.rotation.z = -tilt * dirX;
    }
    if (intensity >= 0.02) this.swayTime += delta;
  }

  /** 果树挂果再生:摘果后计时,到点重新挂果并同步外观(仅房主端推进) */
  private updateFruitRegrow(seconds: number): void {
    for (const prop of this.list) {
      if (prop.kind !== 'tree' || prop.fruited !== false) continue;
      prop.fruitLeft = Math.max(0, (prop.fruitLeft ?? 0) - seconds);
      if (prop.fruitLeft > 0) continue;
      prop.fruited = true;
      this.applyTreeLook(prop);
      this.onChanged?.({ op: 'set', id: prop.id, fields: { fruited: true } });
    }
  }

  /** 未成树每隔 GM 配置的间隔有 1/2 概率长到下一阶段,长成成树后才可砍伐 */
  private updateTreeGrowth(delta: number): void {
    this.growthTimer += delta;
    const interval = GmSystem.treeGrowthInterval;
    if (this.growthTimer < interval) return;
    this.growthTimer -= interval;
    for (const prop of this.list) {
      if (prop.kind !== 'tree' || prop.growth === 'mature' || prop.stage === 'stump') continue;
      if (Math.random() >= GROWTH_CHANCE) continue;
      prop.growth = prop.growth === 'sprout' ? 'sapling' : 'mature';
      // 只有成树可砍;发芽与小树只是外观阶段变化
      prop.ready = prop.growth === 'mature';
      this.applyTreeLook(prop);
      this.onChanged?.({ op: 'set', id: prop.id, fields: { growth: prop.growth, ready: prop.ready } });
    }
  }
}
