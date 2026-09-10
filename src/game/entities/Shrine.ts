import { mergeClayMeshes } from '../core/mergeClayMeshes';
import * as THREE from 'three';
import type { LightPool } from '../world/LightPool';
import { clayMaterial } from '../world/ClayMaterial';

/** 火把火光参数(向光源池领取) */
const TORCH_LIGHT_SPEC = { color: '#ff9d2e', intensity: 1.2, distance: 4.5, decay: 1.5 };

/** 场上神龛的种类(与对应道具的持久化 ID 一致) */
export type ShrineKind = 'poseidonBlessing' | 'beehiveShrine' | 'healCrystal' | 'rainAltar' | 'crocIncense' | 'torch';

/** 各神龛的主题色(宝石、放置特效共用) */
export const SHRINE_COLORS: Record<ShrineKind, string> = {
  poseidonBlessing: '#2ec4b6',
  beehiveShrine: '#e8a13a',
  healCrystal: '#ff9ecb',
  rainAltar: '#6fa8dc',
  crocIncense: '#b08bc9',
  torch: '#ff9d2e',
};


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
  mergeClayMeshes(group, [gem]);
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
  mergeClayMeshes(group, [gem]);
  return { group, gem, gemY: 0.68 };
}

/** 治愈水晶:粉晶簇从石座中生长出来 */
function makeHealCrystalMesh(): ShrineMesh {
  const group = new THREE.Group();
  const base = makeBase();
  mergeClayMeshes(base);
  group.add(base);
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
  mergeClayMeshes(group, [gem]);
  return { group, gem, gemY: 0.74 };
}

/** 防鳄熏香:石座上的香炉插着盘香,顶端一点紫色香火徐徐吐烟 */
function makeCrocIncenseMesh(): ShrineMesh {
  const group = new THREE.Group();
  group.add(makeBase());
  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.14, 7), clayMaterial('#6d5a7e'));
  burner.position.y = 0.42;
  burner.castShadow = true;
  group.add(burner);
  const coilMat = clayMaterial('#c9b8a8');
  for (const [r, y] of [
    [0.16, 0.5],
    [0.1, 0.56],
    [0.05, 0.62],
  ] as const) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 4, 10), coilMat);
    coil.rotation.x = Math.PI / 2;
    coil.position.y = y;
    group.add(coil);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), gemMaterial(SHRINE_COLORS.crocIncense, '#6d4a91'));
  gem.position.y = 0.76;
  group.add(gem);
  // 三缕小烟球,绕着香火缓缓盘旋
  const smokeMat = new THREE.MeshStandardMaterial({ color: '#cfc8d6', flatShading: true, roughness: 1, transparent: true, opacity: 0.7 });
  const smokes: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), smokeMat);
    group.add(smoke);
    smokes.push(smoke);
  }
  mergeClayMeshes(group, [gem, ...smokes]);
  return {
    group,
    gem,
    gemY: 0.76,
    update: (delta, elapsed, ember, emberY) => {
      ember.position.y = emberY + Math.sin(elapsed * 2) * 0.02;
      for (let i = 0; i < smokes.length; i++) {
        const phase = elapsed * 0.5 + (i / smokes.length) * Math.PI * 2;
        const rise = (elapsed * 0.25 + i / smokes.length) % 1;
        smokes[i].position.set(Math.sin(phase) * 0.07, 0.82 + rise * 0.5, Math.cos(phase) * 0.07);
        smokes[i].scale.setScalar(0.6 + rise);
      }
      ember.rotation.y += delta * 1.2;
    },
  };
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
  return {
    group,
    gem,
    gemY: 0.68,
    update: (delta, elapsed, flame, flameY) => {
      const flicker = 1 + Math.sin(elapsed * 11) * 0.08 + Math.sin(elapsed * 23) * 0.05;
      flame.scale.set(flicker, 1 / flicker, flicker);
      flame.rotation.y += delta * 3;
      flame.position.y = flameY + Math.sin(elapsed * 9) * 0.02;
    },
  };
}

const BUILDERS: Record<ShrineKind, () => ShrineMesh> = {
  poseidonBlessing: makePoseidonMesh,
  beehiveShrine: makeBeehiveMesh,
  healCrystal: makeHealCrystalMesh,
  rainAltar: makeRainAltarMesh,
  crocIncense: makeCrocIncenseMesh,
  torch: makeTorchMesh,
};

/** 场景中的神龛摆件(可放置多个);kind 决定造型与提供的祝福 */
export class Shrine {
  readonly group: THREE.Group;
  readonly kind: ShrineKind;
  private gem: THREE.Mesh;
  private gemY: number;
  private customUpdate?: NonNullable<ShrineMesh['update']>;
  /** 火把的火光(从光源池领取;池满或预览场景则无) */
  private light: THREE.PointLight | null = null;
  private lights?: LightPool;

  constructor(scene: THREE.Scene, position: THREE.Vector3, kind: ShrineKind, lights?: LightPool) {
    this.kind = kind;
    this.lights = lights;
    const built = BUILDERS[kind]();
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(this.group);
    this.group.add(built.group);
    this.gem = built.gem;
    this.gemY = built.gemY;
    this.customUpdate = built.update;
    if (kind === 'torch') {
      this.light = lights?.claim(this.group.position, 0.7, TORCH_LIGHT_SPEC) ?? null;
    }
  }

  /** 宝石缓慢旋转、微微起伏的常驻表现(火把为火苗摇曳) */
  update(delta: number, elapsed: number): void {
    if (this.customUpdate) {
      this.customUpdate(delta, elapsed, this.gem, this.gemY);
    } else {
      this.gem.rotation.y += delta * 1.2;
      this.gem.position.y = this.gemY + Math.sin(elapsed * 2) * 0.03;
    }
    if (this.light) {
      const flicker = 1 + Math.sin(elapsed * 11) * 0.08 + Math.sin(elapsed * 23) * 0.05;
      this.light.intensity = 1.2 * flicker;
    }
  }

  dispose(): void {
    if (this.light) {
      this.lights?.release(this.light);
      this.light = null;
    }
  }
}
