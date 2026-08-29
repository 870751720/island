import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { IslandTerrain } from './IslandTerrain';
import {
  GROWTH_CHANCE,
  GROWTH_INTERVAL,
  type TreeSpecies,
  type TreeStage,
} from './TreeSpecies';

const SHAKE_TIME = 0.4;

/** 有阻挡的物件的碰撞半径(树按树干算,大石按岩体算);未列出的种类可穿过 */
const BLOCK_RADIUS: Partial<Record<PropKind, number>> = {
  tree: 0.3,
  rock: 0.6,
};

export type PropKind = 'tree' | 'rock' | 'gravel' | 'berry' | 'shrub' | 'grass';

/** 资源点的可序列化状态(存档用,自然生成的布局由种子保证可复现;玩家种下的树带坐标) */
export type PropState = {
  kind: PropKind;
  ready: boolean;
  regrowLeft: number;
  stage?: 'full' | 'stump';
  species?: TreeSpecies;
  growth?: TreeStage;
  /** 玩家种下的树的落点坐标;自然生成的资源点没有该字段 */
  x?: number;
  z?: number;
};

/** 各类资源点的采集产出与再生时间(秒);regrow 为 0 表示不可再生 */
const PROP_CONFIG: Record<PropKind, { regrow: number }> = {
  tree: { regrow: 0 },
  rock: { regrow: 0 },
  gravel: { regrow: 0 },
  berry: { regrow: 60 },
  shrub: { regrow: 90 },
  grass: { regrow: 60 },
};

export type Prop = {
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
  palm: '#4d9440',
};

/** 发芽:一根细茎顶着两片嫩叶 */
function makeSproutParts(): THREE.Mesh[] {
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.03, 0.16, 4),
    clayMaterial('#7fae55')
  );
  stem.position.y = 0.08;
  const leafL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), clayMaterial('#a4c46a'));
  leafL.position.set(-0.05, 0.18, 0);
  leafL.rotation.z = 0.9;
  const leafR = leafL.clone();
  leafR.position.x = 0.05;
  leafR.rotation.z = -0.9;
  return [stem, leafL, leafR];
}

/** 小树:细树干 + 一团小树冠(按树种配色) */
function makeSaplingParts(species: TreeSpecies): THREE.Mesh[] {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 0.9, 5),
    clayMaterial('#8a6239')
  );
  trunk.position.y = 0.45;
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 0),
    clayMaterial(CROWN_COLORS[species])
  );
  crown.position.y = 1.1;
  const crown2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.3, 0),
    clayMaterial('#4f9440')
  );
  crown2.position.set(0.12, 1.45, 0.08);
  return [trunk, crown, crown2];
}

/** 成树:按树种拼装三种造型 */
function makeMatureParts(species: TreeSpecies): THREE.Mesh[] {
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
  if (species === 'palm') {
    // 棕榈树:粗壮树干,顶端交错多层宽叶并挂上椰子
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.18, 1.5, 5),
      clayMaterial(trunkColor)
    );
    trunk.position.y = 0.75;
    const parts: THREE.Mesh[] = [trunk];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const layer = i < 4 ? 1.52 : 1.38;
      const frond = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.95, 4),
        clayMaterial(i % 2 === 0 ? crownColor : '#5aa84c')
      );
      frond.scale.set(0.45, 1, 1);
      frond.position.set(Math.cos(a) * 0.32, layer, Math.sin(a) * 0.32);
      frond.rotation.set(Math.sin(a) * 0.85, -a, Math.cos(a) * 0.85);
      parts.push(frond);
    }
    const coconutMat = clayMaterial('#6b4f2e');
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const coconut = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), coconutMat);
      coconut.position.set(Math.cos(a) * 0.14, 1.42, Math.sin(a) * 0.14);
      parts.push(coconut);
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

/** 岛上散布的资源点,管理采集后的外观变化、再生与树的生长 */
export class Props implements Updatable {
  readonly list: Prop[] = [];
  /** 自然生成的资源点数量(种下的树追加在其后,存档时需带坐标单独恢复) */
  private naturalCount = 0;
  private berries = new Map<Prop, THREE.Mesh[]>();
  private shakes = new Map<Prop, number>();
  private growthTimer = 0;

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    rng: () => number = Math.random
  ) {
    const half = terrain.size / 2;
    const spawn = (kind: PropKind, count: number) => {
      for (let i = 0; i < count; i++) {
        let x = 0;
        let z = 0;
        let y = -1;
        for (let tries = 0; tries < 20; tries++) {
          x = (rng() * 2 - 1) * half * 0.85;
          z = (rng() * 2 - 1) * half * 0.85;
          y = terrain.getHeight(x, z);
          if (y > 0.3) break;
        }
        if (y <= 0.3) continue;
        // 避开水面及其边缘
        if (terrain.isNearWater(new THREE.Vector3(x, y, z), 1)) continue;
        let berries: THREE.Mesh[] | null = null;
        let group: THREE.Group;
        if (kind === 'tree') group = new THREE.Group();
        else if (kind === 'rock') group = makeRock();
        else if (kind === 'gravel') group = makeGravel();
        else if (kind === 'shrub') group = makeShrub();
        else if (kind === 'grass') group = makeGrassTuft();
        else {
          const made = makeBerryBush();
          group = made.group;
          berries = made.berries;
        }
        group.position.set(x, y - 0.05, z);
        group.rotation.y = rng() * Math.PI * 2;
        scene.add(group);
        const prop: Prop = {
          kind,
          group,
          position: group.position.clone(),
          ready: true,
          regrowLeft: 0,
        };
        if (kind === 'tree') {
          // 岛上的树分三种,随机分布,自然生成的都是成树
          prop.species = TREE_SPECIES_OF(rng);
          prop.growth = 'mature';
        }
        if (kind === 'tree') this.applyTreeLook(prop);
        this.list.push(prop);
        if (berries) this.berries.set(prop, berries);
      }
    };
    spawn('tree', 60);
    spawn('rock', 18);
    spawn('gravel', 32);
    spawn('berry', 20);
    spawn('shrub', 30);
    spawn('grass', 26);
    this.naturalCount = this.list.length;
  }

  /** 玩家种下一棵树:在落点生成发芽阶段的树并纳入管理 */
  plant(species: TreeSpecies, x: number, z: number): Prop {
    const y = this.terrain.getHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, y - 0.05, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    const prop: Prop = {
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
    this.list.push(prop);
    return prop;
  }

  /** 按生长阶段/砍伐阶段重建树的外观(整体替换子网格) */
  private applyTreeLook(prop: Prop): void {
    while (prop.group.children.length > 0) prop.group.remove(prop.group.children[0]);
    const parts =
      prop.stage === 'stump'
        ? makeStumpParts()
        : prop.growth === 'sprout'
          ? makeSproutParts()
          : prop.growth === 'sapling'
            ? makeSaplingParts(prop.species ?? 'oak')
            : makeMatureParts(prop.species ?? 'oak');
    for (const part of parts) {
      part.castShadow = true;
      prop.group.add(part);
    }
  }

  /** 采集后的外观变化,并按配置安排再生 */
  harvest(prop: Prop): void {
    prop.ready = false;
    const { regrow } = PROP_CONFIG[prop.kind];
    if (regrow > 0) {
      prop.regrowLeft = regrow;
    }
    if (prop.kind === 'tree' && prop.stage !== 'stump' && prop.growth === 'mature') {
      // 成树第一段砍掉树冠只留树桩,树桩仍可继续砍;小树砍倒即消失
      prop.stage = 'stump';
      prop.ready = true;
    }
    this.syncAppearance(prop);
  }

  /** 依据 ready/stage/growth 同步采集后的外观(树桩保留,其余隐藏或缩形) */
  private syncAppearance(prop: Prop): void {
    switch (prop.kind) {
      case 'tree':
        this.applyTreeLook(prop);
        // 发芽始终可见;其余阶段被砍倒(成树砍桩后/小树砍倒后)整体隐藏
        prop.group.visible = prop.growth === 'sprout' || prop.ready;
        break;
      case 'rock':
      case 'gravel':
      case 'grass':
        prop.group.visible = prop.ready;
        break;
      case 'berry':
        // 浆果丛保留,只藏起果子
        for (const berry of this.berries.get(prop) ?? []) berry.visible = prop.ready;
        break;
      case 'shrub':
        // 灌木丛被割后缩成小桩
        prop.group.scale.setScalar(prop.ready ? 1 : 0.35);
        break;
    }
  }

  /** 当前全部资源点状态快照(存档用,自然生成在前、种下的树带坐标在后) */
  snapshot(): PropState[] {
    return this.list.map((prop, i) => {
      const state: PropState = {
        kind: prop.kind,
        ready: prop.ready,
        regrowLeft: prop.regrowLeft,
        stage: prop.stage,
      };
      if (prop.kind === 'tree') {
        state.species = prop.species;
        state.growth = prop.growth;
      }
      if (i >= this.naturalCount) {
        state.x = prop.position.x;
        state.z = prop.position.z;
      }
      return state;
    });
  }

  /** 从存档恢复各资源点状态;自然部分长度或种类对不上时跳过(布局已变) */
  applySave(states: PropState[]): void {
    const natural = states.filter((s) => s.x === undefined);
    const planted = states.filter((s) => s.x !== undefined);
    if (natural.length !== this.naturalCount) return;
    this.removePlanted();
    for (let i = 0; i < natural.length; i++) {
      const prop = this.list[i];
      const state = natural[i];
      if (!state || state.kind !== prop.kind) return;
      prop.ready = state.ready;
      prop.regrowLeft = state.regrowLeft;
      prop.stage = state.stage;
      if (prop.kind === 'tree') {
        prop.species = state.species ?? 'oak';
        prop.growth = state.growth ?? 'mature';
        // 小树随时可砍(只出树枝)
        if (prop.growth === 'sapling') prop.ready = true;
      }
      this.syncAppearance(prop);
    }
    for (const state of planted) {
      if (state.kind !== 'tree' || state.x === undefined || state.z === undefined) continue;
      const prop = this.plant(state.species ?? 'oak', state.x, state.z);
      prop.ready = state.ready;
      prop.regrowLeft = state.regrowLeft;
      prop.stage = state.stage;
      prop.growth = state.growth ?? 'sprout';
      this.syncAppearance(prop);
    }
  }

  /** 移除玩家种下的树(读档恢复前清理) */
  private removePlanted(): void {
    for (const prop of this.list.splice(this.naturalCount)) {
      this.scene.remove(prop.group);
    }
  }

  /** 将圆形实体沿 XZ 推出有阻挡的物件(成树、树桩与大石),原地修改位置 */
  resolveCollision(p: THREE.Vector3, radius: number): void {
    for (const prop of this.list) {
      const blockR = BLOCK_RADIUS[prop.kind];
      // 幼树不阻挡;树被砍倒(整体隐藏)或大石被采空后不再阻挡;树桩仍阻挡
      if (prop.kind === 'tree' && prop.growth !== 'mature' && prop.stage !== 'stump') continue;
      if (!blockR || !prop.group.visible) continue;
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

  /** 命中时的受击晃动,持续衰减 */
  shake(prop: Prop): void {
    this.shakes.set(prop, SHAKE_TIME);
  }

  update(delta: number): void {
    for (const prop of this.list) {
      if (prop.ready || prop.regrowLeft <= 0) continue;
      prop.regrowLeft -= delta;
      if (prop.regrowLeft > 0) continue;
      prop.ready = true;
      prop.regrowLeft = 0;
      if (prop.kind === 'berry') {
        for (const berry of this.berries.get(prop) ?? []) berry.visible = true;
      } else if (prop.kind === 'grass') {
        prop.group.visible = true;
      } else if (prop.kind === 'shrub') {
        prop.group.scale.setScalar(1);
      }
    }
    this.updateTreeGrowth(delta);
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
  }

  /** 未成树每分钟有 1/2 概率长到下一阶段,长成成树后才可砍伐 */
  private updateTreeGrowth(delta: number): void {
    this.growthTimer += delta;
    if (this.growthTimer < GROWTH_INTERVAL) return;
    this.growthTimer -= GROWTH_INTERVAL;
    for (const prop of this.list) {
      if (prop.kind !== 'tree' || prop.growth === 'mature' || prop.stage === 'stump') continue;
      if (Math.random() >= GROWTH_CHANCE) continue;
      prop.growth = prop.growth === 'sprout' ? 'sapling' : 'mature';
      // 长成小树后即可砍伐(只出树枝),长成成树产出完整
      prop.ready = true;
      this.applyTreeLook(prop);
    }
  }
}

/** 用生成种子对应的随机流挑一个树种 */
function TREE_SPECIES_OF(rng: () => number): TreeSpecies {
  const species: TreeSpecies[] = ['oak', 'pine', 'palm'];
  return species[Math.floor(rng() * species.length)];
}
