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
  cola: '#c0392b',
  colaZero: '#2c3e50',
  bottle: '#a8d4d6',
  sardine: '#b8cdd9',
  perch: '#8fa87b',
  shrimp: '#e8927c',
  loach: '#8a7a4a',
  puffer: '#d9c15a',
  cuttlefish: '#6b5f8a',
  grouper: '#6d7b5a',
  catfish: '#5b664f',
  swordfish: '#5a7d9e',
  manta: '#4a5568',
  goldenFish: '#e6b422',
  reviveStone: '#7fd8e8',
  poseidonBlessing: '#2ec4b6',
  beehiveShrine: '#e8a13a',
  healCrystal: '#ff9ecb',
  rainAltar: '#6fa8dc',
  torch: '#ff9d2e',
  crabMeat: '#e2793a',
  birdMeat: '#c98a5a',
  gameMeat: '#b04a3a',
  fur: '#9a7448',
  cookedBerry: '#a0522d',
  cookedSmallFish: '#d99a4e',
  cookedBigFish: '#c76b3a',
  cookedGoldenFish: '#e6b422',
  cookedCrabMeat: '#e8703a',
  cookedBirdMeat: '#b5722f',
  cookedGameMeat: '#9c4a2f',
  arrow: '#a97c50',
  bait: '#c98a7a',
  oakSeed: '#b5813f',
  pineSeed: '#8a6b45',
  fruitSeed: '#a0784e',
  oakFruit: '#b5813f',
  pineFruit: '#8a6b45',
  fruitFruit: '#c0392b',
  axe: '#8b5a2b',
  pickaxe: '#7d848a',
  hoe: '#8a7a5a',
  fishingrod: '#a97c50',
  bow: '#8b6b42',
  sword: '#c9a877',
  grassShirt: '#5a8a3a',
  furShirt: '#8a6239',
  grassPants: '#4a7a3a',
  furPants: '#75512c',
  strawHat: '#d9c27a',
  furHat: '#9a7448',
  strawBackpack: '#c9a56a',
  furBackpack: '#8a5a2b',
  crate: '#a97b48',
  baitBarrel: '#9a6b3f',
  fenceWood: '#a97b48',
  fenceStone: '#9a9a9a',
  fenceGate: '#8a6239',
  berryBush: '#5d8a3a',
  shrubBush: '#6b8f4e',
  grassTuft: '#a4c46a',
  workbench1: '#8a6239',
  workbench2: '#8d99a6',
  workbench3: '#8a6239',
  workbench4: '#c9a15c',
  bed1: '#c9a15c',
  bed2: '#d8c3a5',
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

/** 生兽肉:带腿骨的大块红肉 */
function makeGameMeat(): THREE.Object3D {
  const g = new THREE.Group();
  const flesh = mesh(new THREE.IcosahedronGeometry(0.18, 0), clay(DROP_COLORS.gameMeat));
  flesh.scale.set(1.2, 0.85, 0.9);
  flesh.position.y = 0.12;
  const boneMat = clay('#e8e2d4');
  const bone = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.28, 4), boneMat);
  bone.rotation.z = Math.PI / 2 - 0.25;
  bone.position.set(0.24, 0.16, 0);
  const knob = mesh(new THREE.IcosahedronGeometry(0.045, 0), boneMat);
  knob.position.set(0.36, 0.2, 0);
  g.add(flesh, bone, knob);
  return g;
}

/** 皮毛:一整张带绒毛边的兽皮 */
function makeFur(): THREE.Object3D {
  const g = new THREE.Group();
  const hide = mesh(new THREE.IcosahedronGeometry(0.2, 0), clay(DROP_COLORS.fur));
  hide.scale.set(1.3, 0.4, 1);
  hide.position.y = 0.08;
  g.add(hide);
  // 四角的绒毛尖
  const tuftMat = clay('#c9a877');
  for (const [x, z] of [
    [0.2, 0.14],
    [-0.2, 0.14],
    [0.2, -0.14],
    [-0.2, -0.14],
  ]) {
    const tuft = mesh(new THREE.ConeGeometry(0.05, 0.14, 4), tuftMat);
    tuft.position.set(x, 0.12, z);
    tuft.rotation.z = x > 0 ? -0.5 : 0.5;
    g.add(tuft);
  }
  return g;
}

/** 烤物:焦糖色的肉串,带烤痕;scale 整体放大 */
function makeRoast(color: string, scale = 1): THREE.Object3D {
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
  g.scale.setScalar(scale);
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

/** 鱼:纺锤形鱼身 + 三角尾鳍 + 背鳍,按体型参数适配各鱼种 */
function makeFishShape(color: string, sx = 1, sy = 1, sz = 1): THREE.Object3D {
  const g = new THREE.Group();
  const bodyMat = clay(color);
  const finMat = clay('#3d7aa8');
  const bellyMat = clay('#cfe4ef');
  const body = mesh(new THREE.IcosahedronGeometry(0.18, 0), bodyMat);
  body.scale.set(sx, 0.6 * sy, 1.5 * sz);
  body.position.y = 0.12;
  const belly = mesh(new THREE.IcosahedronGeometry(0.14, 0), bellyMat);
  belly.scale.set(0.9 * sx, 0.45 * sy, 1.3 * sz);
  belly.position.set(0, 0.04, 0.04);
  const tail = mesh(new THREE.ConeGeometry(0.1, 0.2, 4), finMat);
  tail.rotation.x = -Math.PI / 2;
  tail.scale.set(0.4, sz, sx);
  tail.position.set(0, 0.12, 0.32 * sz);
  const dorsal = mesh(new THREE.ConeGeometry(0.07, 0.14, 4), finMat);
  dorsal.scale.set(0.35 * sx, sy, sz);
  dorsal.position.set(0, 0.26 * sy, 0.02);
  g.add(body, belly, tail, dorsal);
  return g;
}

/** 可乐罐:圆柱罐身 + 浅色标签带 */
function makeCan(color: string): THREE.Object3D {
  const g = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 8), clay(color));
  body.position.y = 0.12;
  const band = mesh(new THREE.CylinderGeometry(0.093, 0.093, 0.07, 8), clay('#e8e2d4'));
  band.position.y = 0.12;
  const top = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 8), clay('#c8c8c8'));
  top.position.y = 0.25;
  g.add(body, band, top);
  return g;
}

/** 漂流瓶:圆瓶身 + 瓶颈 + 木塞,内藏一卷字条 */
function makeBottle(): THREE.Object3D {
  const g = new THREE.Group();
  const mat = clay(DROP_COLORS.bottle);
  const body = mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.26, 6), mat);
  body.position.y = 0.13;
  const neck = mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.12, 6), mat);
  neck.position.y = 0.31;
  const cork = mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.05, 6), clay('#b5813f'));
  cork.position.y = 0.39;
  const note = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 4), clay('#f2ead0'));
  note.position.y = 0.13;
  g.add(body, neck, cork, note);
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

/** 木剑:斜插的扁剑身 + 十字护手(工具不掉落,仅为掉落物表补全) */
function makeSword(): THREE.Object3D {
  const g = new THREE.Group();
  const blade = mesh(new THREE.BoxGeometry(0.07, 0.55, 0.025), clay(DROP_COLORS.sword));
  blade.position.y = 0.42;
  const tip = mesh(new THREE.ConeGeometry(0.05, 0.12, 4), clay(DROP_COLORS.sword));
  tip.position.y = 0.75;
  const guard = mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), clay('#a97b48'));
  guard.position.y = 0.14;
  const handle = mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.24, 5), clay('#8a6239'));
  handle.position.y = 0.0;
  g.add(blade, tip, guard, handle);
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

/** 锄头:木柄 + 宽扁的石刃 */
function makeHoe(): THREE.Object3D {
  const g = new THREE.Group();
  const handle = toolHandle(clay('#8b6239'));
  const blade = mesh(new THREE.BoxGeometry(0.22, 0.05, 0.14), clay(DROP_COLORS.hoe));
  blade.position.set(0.1, 0.66, 0);
  blade.rotation.z = 0.5;
  g.add(handle, blade);
  return g;
}

/** 可挖走的丛:一团长叶体点缀小果(浆果丛)或纯叶团(灌木丛) */
function makeBushDrop(color: string, withBerries: boolean): THREE.Object3D {
  const g = new THREE.Group();
  const mat = clay(color);
  const body = mesh(new THREE.IcosahedronGeometry(0.2, 0), mat);
  body.position.y = 0.16;
  g.add(body);
  if (withBerries) {
    for (const [x, z] of [
      [0.14, 0.08],
      [-0.12, 0.1],
      [0.02, -0.15],
    ]) {
      const berry = mesh(new THREE.IcosahedronGeometry(0.05, 0), clay('#c0392b'));
      berry.position.set(x, 0.24, z);
      g.add(berry);
    }
  }
  return g;
}

/** 复活石道具:微微发光的青蓝色晶石 */
function makeReviveStone(): THREE.Object3D {
  const g = new THREE.Group();
  const stone = mesh(
    new THREE.OctahedronGeometry(0.14, 0),
    new THREE.MeshStandardMaterial({
      color: DROP_COLORS.reviveStone,
      flatShading: true,
      roughness: 0.4,
      emissive: '#3aa8bb',
    })
  );
  stone.position.y = 0.14;
  stone.scale.y = 1.3;
  g.add(stone);
  return g;
}

/** 波塞冬的祝福道具:带宝石座的迷你三叉戟 */
function makePoseidonDrop(): THREE.Object3D {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.07, 6), clay('#8d99a6'));
  base.position.y = 0.04;
  g.add(base);
  const gem = mesh(new THREE.OctahedronGeometry(0.06, 0), clay(DROP_COLORS.poseidonBlessing));
  gem.position.y = 0.12;
  g.add(gem);
  const shaft = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.34, 4), clay('#8a6239'));
  shaft.position.y = 0.3;
  g.add(shaft);
  const cross = mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), clay('#c9a15c'));
  cross.position.y = 0.46;
  g.add(cross);
  for (const dx of [-0.05, 0, 0.05]) {
    const prong = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 4), clay('#c9a15c'));
    prong.position.set(dx, 0.52, 0);
    g.add(prong);
  }
  return g;
}

/** 神龛类道具:迷你石座 + 各自主题的发光宝石 */
function makeShrineDrop(color: string, emissive: string, gemScaleY = 1): THREE.Object3D {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.07, 6), clay('#8d99a6'));
  base.position.y = 0.04;
  g.add(base);
  const gem = mesh(
    new THREE.OctahedronGeometry(0.07, 0),
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.4, emissive })
  );
  gem.scale.y = gemScaleY;
  gem.position.y = 0.15;
  g.add(gem);
  return g;
}

/** 火把道具:横躺的迷你树枝,顶端一团未点燃的浸油布头 */
function makeTorchDrop(): THREE.Object3D {
  const g = new THREE.Group();
  const stick = mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.32, 4), clay('#8a6239'));
  stick.rotation.z = Math.PI / 2;
  stick.position.y = 0.05;
  g.add(stick);
  const wrap = mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.09, 5), clay('#6b4a26'));
  wrap.rotation.z = Math.PI / 2;
  wrap.position.set(0.15, 0.05, 0);
  g.add(wrap);
  return g;
}

/** 工作台道具:小桌面 + 四条腿,等级越高桌面材质与点缀越讲究 */
function makeWorkbenchDrop(level: number): THREE.Object3D {
  const g = new THREE.Group();
  const top = mesh(
    new THREE.BoxGeometry(0.36, 0.06, 0.26),
    clay(level >= 2 ? DROP_COLORS.workbench2 : DROP_COLORS.workbench1)
  );
  top.position.y = 0.22;
  g.add(top);
  for (const [x, z] of [
    [-0.14, -0.09],
    [0.14, -0.09],
    [-0.14, 0.09],
    [0.14, 0.09],
  ]) {
    const leg = mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.2, 4), clay('#8a6239'));
    leg.position.set(x, 0.1, z);
    g.add(leg);
  }
  if (level >= 3) {
    const anvil = mesh(new THREE.DodecahedronGeometry(0.05, 0), clay('#5f6b78'));
    anvil.position.set(0.08, 0.28, 0);
    g.add(anvil);
  }
  if (level >= 4) {
    const roof = mesh(new THREE.BoxGeometry(0.42, 0.02, 0.14), clay(DROP_COLORS.workbench4));
    roof.position.set(0, 0.42, -0.06);
    roof.rotation.x = -0.12;
    g.add(roof);
  }
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
  cola: () => makeCan(DROP_COLORS.cola),
  colaZero: () => makeCan(DROP_COLORS.colaZero),
  bottle: makeBottle,
  sardine: () => makeFishShape(DROP_COLORS.sardine, 0.85, 0.85, 1),
  perch: () => makeFishShape(DROP_COLORS.perch),
  shrimp: () => makeFishShape(DROP_COLORS.shrimp, 0.7, 0.7, 1.2),
  loach: () => makeFishShape(DROP_COLORS.loach, 0.7, 0.6, 1.5),
  puffer: () => makeFishShape(DROP_COLORS.puffer, 1.2, 1.1, 0.9),
  cuttlefish: () => makeFishShape(DROP_COLORS.cuttlefish, 1.3, 0.6, 0.9),
  grouper: () => makeFishShape(DROP_COLORS.grouper, 1.2, 1.2, 1.3),
  catfish: () => makeFishShape(DROP_COLORS.catfish, 1.1, 0.9, 1.6),
  swordfish: () => makeFishShape(DROP_COLORS.swordfish, 0.9, 0.9, 1.8),
  manta: () => makeFishShape(DROP_COLORS.manta, 1.8, 0.5, 1.1),
  goldenFish: () => makeFishShape(DROP_COLORS.goldenFish, 1.1, 1.1, 1.2),
  reviveStone: makeReviveStone,
  poseidonBlessing: makePoseidonDrop,
  beehiveShrine: () => makeShrineDrop(DROP_COLORS.beehiveShrine, '#9c6a1a', 1.3),
  healCrystal: () => makeShrineDrop(DROP_COLORS.healCrystal, '#c4537f', 1.7),
  rainAltar: () => makeShrineDrop(DROP_COLORS.rainAltar, '#2b5f9e', 1.5),
  torch: makeTorchDrop,
  crabMeat: makeCrabMeat,
  birdMeat: makeBirdMeat,
  gameMeat: makeGameMeat,
  fur: makeFur,
  cookedBerry: makeCookedBerry,
  cookedSmallFish: () => makeRoast(DROP_COLORS.cookedSmallFish),
  cookedBigFish: () => makeRoast(DROP_COLORS.cookedBigFish, 1.3),
  cookedGoldenFish: () => makeRoast(DROP_COLORS.cookedGoldenFish, 1.3),
  cookedCrabMeat: () => makeRoast(DROP_COLORS.cookedCrabMeat),
  cookedBirdMeat: () => makeRoast(DROP_COLORS.cookedBirdMeat),
  cookedGameMeat: () => makeRoast(DROP_COLORS.cookedGameMeat),
  arrow: makeArrows,
  bait: () => {
    // 鱼饵:一小串蜷曲的粉色肉团
    const g = new THREE.Group();
    const mat = clay(DROP_COLORS.bait);
    for (const [x, r] of [
      [0, 0.07],
      [0.1, 0.05],
      [-0.09, 0.05],
    ] as const) {
      const ball = mesh(new THREE.IcosahedronGeometry(r, 0), mat);
      ball.position.set(x, 0.05, 0);
      g.add(ball);
    }
    return g;
  },
  oakSeed: () => makeSeed(DROP_COLORS.oakSeed),
  pineSeed: () => makeSeed(DROP_COLORS.pineSeed),
  fruitSeed: () => makeSeed(DROP_COLORS.fruitSeed),
  oakFruit: () => makeFruit(DROP_COLORS.oakFruit),
  pineFruit: () => makeFruit(DROP_COLORS.pineFruit),
  fruitFruit: () => makeFruit(DROP_COLORS.fruitFruit),
  axe: makeAxe,
  pickaxe: makePickaxe,
  hoe: makeHoe,
  fishingrod: makeFishingRod,
  bow: makeBow,
  sword: makeSword,
  grassShirt: () => makeShirt(DROP_COLORS.grassShirt),
  furShirt: () => makeShirt(DROP_COLORS.furShirt),
  grassPants: () => makePants(DROP_COLORS.grassPants),
  furPants: () => makePants(DROP_COLORS.furPants),
  strawHat: () => makeHat(DROP_COLORS.strawHat, '#a8823c'),
  furHat: () => makeHat(DROP_COLORS.furHat, '#6b4a28'),
  strawBackpack: () => makeBackpack(DROP_COLORS.strawBackpack),
  furBackpack: () => makeBackpack(DROP_COLORS.furBackpack),
  crate: () => {
    // 木箱:小箱体 + 两条封边条
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: DROP_COLORS.crate, flatShading: true, roughness: 1 });
    const band = new THREE.MeshStandardMaterial({ color: '#7a5a32', flatShading: true, roughness: 1 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.16), wood);
    body.castShadow = true;
    g.add(body);
    for (const z of [-0.07, 0.07]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.17, 0.03), band);
      strip.position.z = z;
      g.add(strip);
    }
    return g;
  },
  baitBarrel: () => {
    // 饵料桶:小木桶身 + 两道桶箍
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: DROP_COLORS.baitBarrel, flatShading: true, roughness: 1 });
    const band = new THREE.MeshStandardMaterial({ color: '#5f452a', flatShading: true, roughness: 1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.18, 8), wood);
    body.position.y = 0.09;
    body.castShadow = true;
    g.add(body);
    for (const y of [0.04, 0.14]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(y === 0.04 ? 0.088 : 0.098, 0.01, 5, 10), band);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = y;
      g.add(hoop);
    }
    return g;
  },
  fenceWood: () => makeFenceDrop('wood'),
  fenceStone: () => makeFenceDrop('stone'),
  fenceGate: () => makeGateDrop(),
  berryBush: () => makeBushDrop(DROP_COLORS.berryBush, true),
  shrubBush: () => makeBushDrop(DROP_COLORS.shrubBush, false),
  grassTuft: () => makeGrassTuftDrop(),
  workbench1: () => makeWorkbenchDrop(1),
  workbench2: () => makeWorkbenchDrop(2),
  workbench3: () => makeWorkbenchDrop(3),
  workbench4: () => makeWorkbenchDrop(4),
  bed1: () => makeBedDrop(1),
  bed2: () => makeBedDrop(2),
};

/** 围栏道具掉落物:一段柱 + 两根横杆 */
function makeFenceDrop(kind: 'wood' | 'stone'): THREE.Object3D {
  const g = new THREE.Group();
  const color = DROP_COLORS[kind === 'wood' ? 'fenceWood' : 'fenceStone'];
  const post = mesh(
    kind === 'wood'
      ? new THREE.CylinderGeometry(0.035, 0.045, 0.28, 6)
      : new THREE.BoxGeometry(0.09, 0.28, 0.09),
    clay(color)
  );
  post.position.y = 0.14;
  g.add(post);
  for (const y of [0.08, 0.2]) {
    const rail = mesh(new THREE.BoxGeometry(0.3, kind === 'wood' ? 0.04 : 0.06, 0.03), clay(color));
    rail.position.y = y;
    g.add(rail);
  }
  return g;
}

/** 围栏门道具掉落物:小门框 + 微开的门扇 */
function makeGateDrop(): THREE.Object3D {
  const g = new THREE.Group();
  const frame = clay(DROP_COLORS.fenceGate);
  for (const x of [-0.14, 0.14]) {
    const post = mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.3, 6), frame);
    post.position.set(x, 0.15, 0);
    g.add(post);
  }
  const leaf = new THREE.Group();
  leaf.position.set(-0.13, 0, 0);
  leaf.rotation.y = -0.5;
  const door = mesh(new THREE.BoxGeometry(0.24, 0.16, 0.02), clay('#a97b48'));
  door.position.set(0.12, 0.14, 0);
  leaf.add(door);
  g.add(leaf);
  return g;
}

/** 草丛掉落物:一小束交叉的草叶 */
function makeGrassTuftDrop(): THREE.Object3D {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const blade = mesh(new THREE.ConeGeometry(0.04, 0.24, 3), clay(i % 2 === 0 ? DROP_COLORS.grassTuft : '#7fae55'));
    const a = (i / 4) * Math.PI * 2 + 0.4;
    blade.position.set(Math.cos(a) * 0.07, 0.12, Math.sin(a) * 0.07);
    blade.rotation.set(Math.sin(a) * 0.35, a, -Math.cos(a) * 0.35);
    g.add(blade);
  }
  return g;
}

/** 床掉落物:微型床架 + 床垫 + 枕头(按等级区分床架材质) */function makeBedDrop(level: number): THREE.Object3D {
  const g = new THREE.Group();
  const frame = clay(level >= 2 ? '#8d99a6' : '#8a6239');
  const mattress = clay(DROP_COLORS[level >= 2 ? 'bed2' : 'bed1']);
  const base = mesh(new THREE.BoxGeometry(0.44, 0.06, 0.24), frame);
  base.position.y = 0.08;
  g.add(base);
  if (level < 2) {
    for (const [x, z] of [
      [-0.18, -0.08],
      [0.18, -0.08],
      [-0.18, 0.08],
      [0.18, 0.08],
    ]) {
      const leg = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 5), frame);
      leg.position.set(x, 0.04, z);
      g.add(leg);
    }
  }
  const pad = mesh(new THREE.BoxGeometry(0.4, 0.05, 0.2), mattress);
  pad.position.y = 0.14;
  g.add(pad);
  const pillow = mesh(new THREE.BoxGeometry(0.1, 0.04, 0.14), clay('#efe3d0'));
  pillow.position.set(-0.13, 0.18, 0);
  g.add(pillow);
  return g;
}

/** 按道具种类构建专属掉落物造型(低面数程序化拼装) */
export function makeDropModel(kind: ResourceKind): THREE.Object3D {
  return BUILDERS[kind]();
}
