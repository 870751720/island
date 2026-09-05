import * as THREE from 'three';

/** 场上神龛的种类(与对应道具的持久化 ID 一致) */
export type ShrineKind = 'poseidonBlessing' | 'beehiveShrine' | 'healCrystal' | 'rainAltar' | 'torch';

/** 各神龛的主题色(宝石、放置特效共用) */
export const SHRINE_COLORS: Record<ShrineKind, string> = {
  poseidonBlessing: '#2ec4b6',
  beehiveShrine: '#e8a13a',
  healCrystal: '#ff9ecb',
  rainAltar: '#6fa8dc',
  torch: '#ff9d2e',
};

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

function gemMaterial(color: string, emissive: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.4, emissive });
}

/** 石砌基座(两层),各神龛共用 */
function makeBase(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.22, 7), clayMaterial('#8d99a6'));
  base.position.y = 0.11;
  base.castShadow = true;
  g.add(base);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 0.18, 7), clayMaterial('#5d6d7e'));
  upper.position.y = 0.3;
  upper.castShadow = true;
  g.add(upper);
  return g;
}

type ShrineMesh = {
  group: THREE.Group;
  gem: THREE.Mesh;
  gemY: number;
  /** 覆盖默认的宝石常驻表现(如火把的火焰摇曳) */
  update?: (delta: number, elapsed: number, gem: THREE.Mesh, gemY: number) => void;
};

/** 波塞冬神像:蓝绿宝石座 + 三叉戟,插在浪花石上 */
function makePoseidonMesh(): ShrineMesh {
  const group = new THREE.Group();
  group.add(makeBase());
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), gemMaterial(SHRINE_COLORS.poseidonBlessing, '#1a8f85'));
  gem.position.y = 0.56;
  gem.castShadow = true;
  group.add(gem);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.3, 5), clayMaterial('#8a6239'));
  shaft.position.y = 1.2;
  shaft.castShadow = true;
  group.add(shaft);
  const prongMat = clayMaterial('#c9a15c');
  for (const dx of [-0.14, 0, 0.14]) {
    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 4), prongMat);
    prong.position.set(dx, 1.95, 0);
    if (dx !== 0) prong.rotation.z = dx > 0 ? -0.22 : 0.22;
    prong.castShadow = true;
    group.add(prong);
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.05), prongMat);
  cross.position.y = 1.8;
  group.add(cross);
  return { group, gem, gemY: 0.56 };
}

/** 蜂巢神龛:石座上叠一只琥珀色蜂巢,巢脾间透着蜜光 */
function makeBeehiveMesh(): ShrineMesh {
  const group = new THREE.Group();
  group.add(makeBase());
  const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), gemMaterial(SHRINE_COLORS.beehiveShrine, '#9c6a1a'));
  gem.scale.y = 1.25;
  gem.position.y = 0.68;
  gem.castShadow = true;
  group.add(gem);
  // 巢口:深色小洞
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.07, 6), clayMaterial('#5a3d12'));
  mouth.position.set(0, 0.72, 0.255);
  group.add(mouth);
  // 环巢飞舞的两只小蜜蜂(小黄球)
  for (const dx of [-0.22, 0.22]) {
    const bee = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), clayMaterial('#f4d35e'));
    bee.position.set(dx, 0.9, 0.12);
    group.add(bee);
  }
  return { group, gem, gemY: 0.68 };
}

/** 治愈水晶:粉晶簇从石座中生长出来 */
function makeHealCrystalMesh(): ShrineMesh {
  const group = new THREE.Group();
  group.add(makeBase());
  const gemMat = gemMaterial(SHRINE_COLORS.healCrystal, '#c4537f');
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), gemMat);
  gem.scale.y = 1.9;
  gem.position.y = 0.75;
  gem.castShadow = true;
  group.add(gem);
  for (const [dx, rot, h] of [
    [-0.18, 0.28, 0.32],
    [0.18, -0.28, 0.28],
  ] as const) {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), gemMat);
    shard.scale.y = 1.7;
    shard.position.set(dx, 0.42 + h / 2, 0.06);
    shard.rotation.z = rot;
    shard.castShadow = true;
    group.add(shard);
  }
  return { group, gem, gemY: 0.75 };
}

/** 雨神祭坛:石座上一只蓝陶钵,钵中悬浮一颗水滴宝石 */
function makeRainAltarMesh(): ShrineMesh {
  const group = new THREE.Group();
  group.add(makeBase());
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.18, 7), clayMaterial('#4a6f9e'));
  bowl.position.y = 0.49;
  bowl.castShadow = true;
  group.add(bowl);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), gemMaterial(SHRINE_COLORS.rainAltar, '#2b5f9e'));
  gem.scale.y = 1.5;
  gem.position.y = 0.74;
  gem.castShadow = true;
  group.add(gem);
  return { group, gem, gemY: 0.74 };
}

/** 火把:插地的树枝顶着永不熄灭的火苗,小范围照亮四周 */
function makeTorchMesh(): ShrineMesh {
  const group = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.5, 5), clayMaterial('#8a6239'));
  stick.position.y = 0.25;
  stick.castShadow = true;
  group.add(stick);
  // 缠在顶端的浸油布头
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.18, 5), clayMaterial('#6b4a26'));
  wrap.position.y = 0.48;
  group.add(wrap);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), gemMaterial('#ffb84d', '#ff7b1c'));
  gem.scale.y = 1.7;
  gem.position.y = 0.68;
  group.add(gem);
  const light = new THREE.PointLight('#ff9d2e', 1.2, 4.5, 1.5);
  light.position.y = 0.7;
  group.add(light);
  return {
    group,
    gem,
    gemY: 0.68,
    update: (delta, elapsed, flame, flameY) => {
      // 火苗摇曳 + 光强轻微抖动
      const flicker = 1 + Math.sin(elapsed * 11) * 0.08 + Math.sin(elapsed * 23) * 0.05;
      flame.scale.set(flicker, 1 / flicker, flicker);
      flame.rotation.y += delta * 3;
      light.intensity = 1.2 * flicker;
      flame.position.y = flameY + Math.sin(elapsed * 9) * 0.02;
    },
  };
}

const BUILDERS: Record<ShrineKind, () => ShrineMesh> = {
  poseidonBlessing: makePoseidonMesh,
  beehiveShrine: makeBeehiveMesh,
  healCrystal: makeHealCrystalMesh,
  rainAltar: makeRainAltarMesh,
  torch: makeTorchMesh,
};

/** 场景中的神龛摆件(可放置多个);kind 决定造型与提供的祝福 */
export class Shrine {
  readonly group: THREE.Group;
  readonly kind: ShrineKind;
  private gem: THREE.Mesh;
  private gemY: number;
  private customUpdate?: NonNullable<ShrineMesh['update']>;

  constructor(scene: THREE.Scene, position: THREE.Vector3, kind: ShrineKind) {
    this.kind = kind;
    const built = BUILDERS[kind]();
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(this.group);
    this.group.add(built.group);
    this.gem = built.gem;
    this.gemY = built.gemY;
    this.customUpdate = built.update;
  }

  /** 宝石缓慢旋转、微微起伏的常驻表现(火把为火苗摇曳) */
  update(delta: number, elapsed: number): void {
    if (this.customUpdate) {
      this.customUpdate(delta, elapsed, this.gem, this.gemY);
      return;
    }
    this.gem.rotation.y += delta * 1.2;
    this.gem.position.y = this.gemY + Math.sin(elapsed * 2) * 0.03;
  }
}
