import * as THREE from 'three';
import type { ResourceKind } from './Inventory';

/** 各道具掉落物的主题色(粒子特效与造型细节共用) */
export const DROP_COLORS: Record<ResourceKind, string> = {
  wood: '#8b5a2b',
  log: '#7a5230',
  stone: '#9a9a9a',
  flint: '#5f6a72',
  berry: '#c0392b',
  fiber: '#a4c46a',
  rope: '#d9c27a',
  fish: '#5fa8d3',
  crabMeat: '#e2793a',
  birdMeat: '#c98a5a',
  cookedBerry: '#a0522d',
  cookedFish: '#d99a4e',
  cookedCrabMeat: '#e8703a',
  cookedBirdMeat: '#b5722f',
  arrow: '#a97c50',
  oakSeed: '#b5813f',
  pineSeed: '#8a6b45',
  fruitSeed: '#a0784e',
  oakFruit: '#b5813f',
  pineFruit: '#8a6b45',
  fruitFruit: '#c0392b',
  axe: '#8b5a2b',
  pickaxe: '#7d848a',
  fishingrod: '#a97c50',
  bow: '#8b6b42',
  leafShirt: '#5a8a3a',
  fiberShirt: '#c9a15c',
  leafPants: '#4a7a3a',
  fiberPants: '#a8823c',
  strawHat: '#d9c27a',
  vineHat: '#8a9a4a',
  strawBackpack: '#c9a56a',
  frameBackpack: '#8a6239',
};

/** 黏土质感材质:flatShading + 高粗糙度 */
function clay(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 });
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  return m;
}

/** 树枝:两根细枝斜搭在一起,带浅色断口 */
function makeWood(): THREE.Object3D {
  const g = new THREE.Group();
  const bark = clay(DROP_COLORS.wood);
  const endMat = clay('#c8a066');
  const twig = (len: number, r: number) => {
    const twigGroup = new THREE.Group();
    twigGroup.add(mesh(new THREE.CylinderGeometry(r, r, len, 5), bark));
    const end = mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.7, 0.02, 5), endMat);
    end.rotation.x = Math.PI / 2;
    end.position.y = len / 2;
    twigGroup.add(end);
    return twigGroup;
  };
  const lower = twig(0.7, 0.05);
  lower.rotation.z = Math.PI / 2;
  lower.rotation.y = 0.3;
  const upper = twig(0.55, 0.045);
  upper.rotation.z = Math.PI / 2;
  upper.rotation.y = -0.2;
  upper.position.y = 0.09;
  g.add(lower, upper);
  return g;
}

/** 木头:一截粗圆木,浅色端面盖 */
function makeLog(): THREE.Object3D {
  const g = new THREE.Group();
  const bark = clay(DROP_COLORS.log);
  const endMat = clay('#c8a066');
  const body = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 6), bark);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  const end1 = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 6), endMat);
  end1.rotation.x = Math.PI / 2;
  end1.position.x = 0.3;
  const end2 = end1.clone();
  end2.position.x = -0.3;
  g.add(end1, end2);
  return g;
}

/** 燧石:带尖锐棱角的深灰石片 */
function makeFlint(): THREE.Object3D {
  const g = new THREE.Group();
  const shard = mesh(new THREE.TetrahedronGeometry(0.18, 0), clay(DROP_COLORS.flint));
  shard.rotation.set(0.4, 0.8, 0.2);
  shard.position.y = 0.12;
  g.add(shard);
  return g;
}

/** 石块:一大一小两块带切面的岩石 */
function makeStone(): THREE.Object3D {
  const g = new THREE.Group();
  const mat = clay(DROP_COLORS.stone);
  const big = mesh(new THREE.DodecahedronGeometry(0.26, 0), mat);
  big.scale.set(1.1, 0.85, 0.95);
  big.rotation.set(0.2, 0.6, 0.15);
  big.position.y = 0.16;
  const small = mesh(new THREE.DodecahedronGeometry(0.11, 0), mat);
  small.position.set(0.26, 0.05, 0.12);
  small.rotation.set(0.4, 1.2, 0.3);
  g.add(big, small);
  return g;
}

/** 浆果:三颗红果 + 两片绿叶 */
function makeBerry(): THREE.Object3D {
  const g = new THREE.Group();
  const berryMat = clay(DROP_COLORS.berry);
  const leafMat = clay('#4a7a3a');
  const positions: [number, number, number][] = [
    [0, 0.09, 0],
    [0.14, 0.06, 0.08],
    [-0.11, 0.06, -0.09],
  ];
  for (const p of positions) {
    const b = mesh(new THREE.IcosahedronGeometry(0.1, 0), berryMat);
    b.position.set(...p);
    g.add(b);
  }
  const leaf1 = mesh(new THREE.ConeGeometry(0.06, 0.16, 4), leafMat);
  leaf1.position.set(0.03, 0.2, 0);
  leaf1.rotation.z = 0.5;
  const leaf2 = leaf1.clone();
  leaf2.position.set(-0.03, 0.2, 0.02);
  leaf2.rotation.z = -0.5;
  g.add(leaf1, leaf2);
  return g;
}

/** 纤维:一束根部捆在一起的草茎,扇形展开 */
function makeFiber(): THREE.Object3D {
  const g = new THREE.Group();
  const stemMat = clay(DROP_COLORS.fiber);
  const bandMat = clay('#7a9a4a');
  for (let i = 0; i < 5; i++) {
    const stem = mesh(new THREE.CylinderGeometry(0.022, 0.035, 0.55, 4), stemMat);
    const tilt = (i - 2) * 0.16;
    stem.rotation.z = tilt;
    stem.position.set(-Math.sin(tilt) * 0.27, 0.27, (i % 2 === 0 ? 1 : -1) * 0.03);
    g.add(stem);
  }
  const band = mesh(new THREE.TorusGeometry(0.06, 0.022, 4, 8), bandMat);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.1;
  g.add(band);
  return g;
}

/** 绳子:盘成两层的绳圈,带一个绳头 */
function makeRope(): THREE.Object3D {
  const g = new THREE.Group();
  const mat = clay(DROP_COLORS.rope);
  const coil = mesh(new THREE.TorusGeometry(0.18, 0.06, 5, 10), mat);
  coil.rotation.x = Math.PI / 2;
  coil.position.y = 0.06;
  const coil2 = mesh(new THREE.TorusGeometry(0.13, 0.055, 5, 10), mat);
  coil2.rotation.x = Math.PI / 2;
  coil2.position.y = 0.16;
  const tail = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 5), mat);
  tail.position.set(0.22, 0.05, 0);
  tail.rotation.z = Math.PI / 2 - 0.3;
  g.add(coil, coil2, tail);
  return g;
}

/** 生蟹肉:橙红色的蟹钳肉块 */
function makeCrabMeat(): THREE.Object3D {
  const g = new THREE.Group();
  const flesh = mesh(new THREE.IcosahedronGeometry(0.16, 0), clay(DROP_COLORS.crabMeat));
  flesh.scale.set(1.2, 0.7, 0.9);
  flesh.position.y = 0.1;
  const shell = mesh(new THREE.ConeGeometry(0.09, 0.14, 4), clay('#b0432a'));
  shell.position.set(0.16, 0.14, 0.05);
  shell.rotation.z = -0.6;
  g.add(flesh, shell);
  return g;
}

/** 生鸟肉:淡粉色的肉块带一小截骨头 */
function makeBirdMeat(): THREE.Object3D {
  const g = new THREE.Group();
  const flesh = mesh(new THREE.IcosahedronGeometry(0.15, 0), clay(DROP_COLORS.birdMeat));
  flesh.scale.set(1.1, 0.75, 0.85);
  flesh.position.y = 0.1;
  const boneMat = clay('#e8e2d4');
  const bone = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 4), boneMat);
  bone.rotation.z = Math.PI / 2 - 0.3;
  bone.position.set(0.2, 0.14, 0);
  const knob = mesh(new THREE.IcosahedronGeometry(0.04, 0), boneMat);
  knob.position.set(0.3, 0.18, 0);
  g.add(flesh, bone, knob);
  return g;
}

/** 烤物:焦糖色的肉串,带烤痕 */
function makeRoast(color: string): THREE.Object3D {
  const g = new THREE.Group();
  const stick = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4), clay('#a97c50'));
  stick.rotation.z = 0.5;
  stick.position.y = 0.28;
  const bodyMat = clay(color);
  for (let i = 0; i < 3; i++) {
    const chunk = mesh(new THREE.IcosahedronGeometry(0.08, 0), bodyMat);
    chunk.position.set(-i * 0.11 + 0.04, 0.31 + i * 0.05, 0);
    g.add(chunk);
  }
  g.add(stick);
  return g;
}

/** 烤浆果:几颗焦糖色的浆果串在小枝上 */
function makeCookedBerry(): THREE.Object3D {
  const g = new THREE.Group();
  const stick = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), clay('#a97c50'));
  stick.rotation.z = 0.5;
  stick.position.y = 0.24;
  const berryMat = clay(DROP_COLORS.cookedBerry);
  for (let i = 0; i < 3; i++) {
    const b = mesh(new THREE.IcosahedronGeometry(0.07, 0), berryMat);
    b.position.set(-i * 0.1 + 0.03, 0.27 + i * 0.05, 0);
    g.add(b);
  }
  g.add(stick);
  return g;
}

/** 箭:几支细木箭斜插成一小捆 */
function makeArrows(): THREE.Object3D {
  const g = new THREE.Group();
  const shaftMat = clay(DROP_COLORS.arrow);
  const headMat = clay('#8a8a8a');
  const featherMat = clay('#e8e2d4');
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const arrow = new THREE.Group();
    const shaft = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 4), shaftMat);
    const head = mesh(new THREE.ConeGeometry(0.04, 0.1, 4), headMat);
    head.position.y = 0.28;
    const feather = mesh(new THREE.BoxGeometry(0.02, 0.14, 0.08), featherMat);
    feather.position.y = -0.18;
    arrow.add(shaft, head, feather);
    arrow.rotation.z = 0.35;
    arrow.position.set(Math.cos(a) * 0.08, 0.05, Math.sin(a) * 0.08);
    g.add(arrow);
  }
  return g;
}

/** 鱼:纺锤形鱼身 + 三角尾鳍 + 背鳍,与钓上来的鱼同色系 */
function makeFish(): THREE.Object3D {
  const g = new THREE.Group();
  const bodyMat = clay(DROP_COLORS.fish);
  const finMat = clay('#3d7aa8');
  const bellyMat = clay('#cfe4ef');
  const body = mesh(new THREE.IcosahedronGeometry(0.18, 0), bodyMat);
  body.scale.set(1, 0.6, 1.5);
  body.position.y = 0.12;
  const belly = mesh(new THREE.IcosahedronGeometry(0.14, 0), bellyMat);
  belly.scale.set(0.9, 0.45, 1.3);
  belly.position.set(0, 0.04, 0.04);
  const tail = mesh(new THREE.ConeGeometry(0.1, 0.2, 4), finMat);
  tail.rotation.x = -Math.PI / 2;
  tail.scale.set(0.4, 1, 1);
  tail.position.set(0, 0.12, 0.32);
  const dorsal = mesh(new THREE.ConeGeometry(0.07, 0.14, 4), finMat);
  dorsal.scale.set(0.35, 1, 1);
  dorsal.position.set(0, 0.26, 0.02);
  g.add(body, belly, tail, dorsal);
  return g;
}

/** 工具通用木柄:竖直的枝干柄 */
function toolHandle(mat: THREE.MeshStandardMaterial): THREE.Mesh {
  const handle = mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.7, 5), mat);
  handle.position.y = 0.35;
  handle.rotation.z = 0.12;
  return handle;
}

/** 斧子:木柄 + 单侧石斧头 */
function makeAxe(): THREE.Object3D {
  const g = new THREE.Group();
  const handle = toolHandle(clay(DROP_COLORS.axe));
  const head = mesh(new THREE.BoxGeometry(0.3, 0.18, 0.07), clay('#9a9a9a'));
  head.position.set(0.14, 0.62, 0);
  head.rotation.z = 0.4;
  const edge = mesh(new THREE.ConeGeometry(0.09, 0.12, 4), clay('#c8c8c8'));
  edge.position.set(0.3, 0.66, 0);
  edge.rotation.z = -Math.PI / 2;
  g.add(handle, head, edge);
  return g;
}

/** 镐子:木柄 + 弯月石镐尖 */
function makePickaxe(): THREE.Object3D {
  const g = new THREE.Group();
  const handle = toolHandle(clay('#8b6239'));
  const headMat = clay(DROP_COLORS.pickaxe);
  const tipL = mesh(new THREE.ConeGeometry(0.05, 0.3, 4), headMat);
  tipL.position.set(-0.16, 0.64, 0);
  tipL.rotation.z = Math.PI / 2;
  const tipR = tipL.clone();
  tipR.position.x = 0.16;
  tipR.rotation.z = -Math.PI / 2;
  g.add(handle, tipL, tipR);
  return g;
}

/** 鱼竿:细长竿身垂下一段绳线 */
function makeFishingRod(): THREE.Object3D {
  const g = new THREE.Group();
  const rod = mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.9, 4), clay(DROP_COLORS.fishingrod));
  rod.position.y = 0.45;
  rod.rotation.z = 0.18;
  const line = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 3), clay('#e8e2d4'));
  line.position.set(0.3, 0.35, 0);
  g.add(rod, line);
  return g;
}

/** 弓:弯成弧线的弓身 + 绷直的弦 */
function makeBow(): THREE.Object3D {
  const g = new THREE.Group();
  const limbMat = clay(DROP_COLORS.bow);
  for (let i = 0; i < 5; i++) {
    const t = (i / 4 - 0.5) * Math.PI * 0.7;
    const seg = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 4), limbMat);
    seg.position.set(-Math.cos(t) * 0.32, 0.36 + Math.sin(t) * 0.4, 0);
    seg.rotation.z = t;
    g.add(seg);
  }
  const string = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.8, 3), clay('#e8e2d4'));
  string.position.set(-0.32, 0.36, 0);
  g.add(string);
  return g;
}

/** 种子:圆润的小粒,带一点芽尖 */
function makeSeed(color: string): THREE.Object3D {
  const g = new THREE.Group();
  const body = mesh(new THREE.IcosahedronGeometry(0.12, 0), clay(color));
  body.scale.set(1, 1.25, 0.9);
  body.position.y = 0.1;
  const sprout = mesh(new THREE.ConeGeometry(0.035, 0.12, 4), clay('#7fae55'));
  sprout.position.y = 0.24;
  g.add(body, sprout);
  return g;
}

/** 果实:一颗饱满的果子带两片叶 */
function makeFruit(color: string): THREE.Object3D {
  const g = new THREE.Group();
  const body = mesh(new THREE.IcosahedronGeometry(0.15, 0), clay(color));
  body.position.y = 0.13;
  const leafMat = clay('#4a7a3a');
  const leaf1 = mesh(new THREE.ConeGeometry(0.05, 0.14, 4), leafMat);
  leaf1.position.set(0.03, 0.28, 0);
  leaf1.rotation.z = 0.5;
  const leaf2 = leaf1.clone();
  leaf2.position.x = -0.03;
  leaf2.rotation.z = -0.5;
  g.add(body, leaf1, leaf2);
  return g;
}

/** 衣服:平铺的上衣形(躯干 + 两袖) */
function makeShirt(color: string): THREE.Object3D {
  const g = new THREE.Group();
  const mat = clay(color);
  const body = mesh(new THREE.BoxGeometry(0.34, 0.34, 0.1), mat);
  body.position.y = 0.18;
  const sleeveL = mesh(new THREE.BoxGeometry(0.1, 0.26, 0.09), mat);
  sleeveL.rotation.z = 0.5;
  sleeveL.position.set(-0.24, 0.22, 0);
  const sleeveR = sleeveL.clone();
  sleeveR.rotation.z = -0.5;
  sleeveR.position.x = 0.24;
  g.add(body, sleeveL, sleeveR);
  return g;
}

/** 裤子:平铺的长裤形(腰 + 两裤腿) */
function makePants(color: string): THREE.Object3D {
  const g = new THREE.Group();
  const mat = clay(color);
  const waist = mesh(new THREE.BoxGeometry(0.3, 0.14, 0.1), mat);
  waist.position.y = 0.42;
  const legL = mesh(new THREE.BoxGeometry(0.13, 0.36, 0.09), mat);
  legL.position.set(-0.08, 0.18, 0);
  const legR = legL.clone();
  legR.position.x = 0.08;
  g.add(waist, legL, legR);
  return g;
}

/** 帽子:圆顶宽檐帽,帽身绕一圈装饰带 */
function makeHat(color: string, band: string): THREE.Object3D {
  const g = new THREE.Group();
  const mat = clay(color);
  const brim = mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.04, 8), mat);
  brim.position.y = 0.05;
  const top = mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.16, 8), mat);
  top.position.y = 0.14;
  const belt = mesh(new THREE.TorusGeometry(0.155, 0.025, 4, 8), clay(band));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.09;
  g.add(brim, top, belt);
  return g;
}

/** 背包:鼓鼓的背囊加一根提带 */
function makeBackpack(color: string): THREE.Object3D {
  const g = new THREE.Group();
  const pack = mesh(new THREE.BoxGeometry(0.32, 0.38, 0.18), clay(color));
  pack.position.y = 0.2;
  const flap = mesh(new THREE.BoxGeometry(0.34, 0.1, 0.2), clay(color));
  flap.position.y = 0.4;
  const handle = mesh(new THREE.TorusGeometry(0.07, 0.02, 4, 8), clay(color));
  handle.position.y = 0.48;
  g.add(pack, flap, handle);
  return g;
}

const BUILDERS: Record<ResourceKind, () => THREE.Object3D> = {
  wood: makeWood,
  log: makeLog,
  stone: makeStone,
  flint: makeFlint,
  berry: makeBerry,
  fiber: makeFiber,
  rope: makeRope,
  fish: makeFish,
  crabMeat: makeCrabMeat,
  birdMeat: makeBirdMeat,
  cookedBerry: makeCookedBerry,
  cookedFish: () => makeRoast(DROP_COLORS.cookedFish),
  cookedCrabMeat: () => makeRoast(DROP_COLORS.cookedCrabMeat),
  cookedBirdMeat: () => makeRoast(DROP_COLORS.cookedBirdMeat),
  arrow: makeArrows,
  oakSeed: () => makeSeed(DROP_COLORS.oakSeed),
  pineSeed: () => makeSeed(DROP_COLORS.pineSeed),
  fruitSeed: () => makeSeed(DROP_COLORS.fruitSeed),
  oakFruit: () => makeFruit(DROP_COLORS.oakFruit),
  pineFruit: () => makeFruit(DROP_COLORS.pineFruit),
  fruitFruit: () => makeFruit(DROP_COLORS.fruitFruit),
  axe: makeAxe,
  pickaxe: makePickaxe,
  fishingrod: makeFishingRod,
  bow: makeBow,
  leafShirt: () => makeShirt(DROP_COLORS.leafShirt),
  fiberShirt: () => makeShirt(DROP_COLORS.fiberShirt),
  leafPants: () => makePants(DROP_COLORS.leafPants),
  fiberPants: () => makePants(DROP_COLORS.fiberPants),
  strawHat: () => makeHat(DROP_COLORS.strawHat, '#a8823c'),
  vineHat: () => makeHat(DROP_COLORS.vineHat, '#c9c27a'),
  strawBackpack: () => makeBackpack(DROP_COLORS.strawBackpack),
  frameBackpack: () => makeBackpack(DROP_COLORS.frameBackpack),
};

/** 按道具种类构建专属掉落物造型(低面数程序化拼装) */
export function makeDropModel(kind: ResourceKind): THREE.Object3D {
  return BUILDERS[kind]();
}
