import * as THREE from 'three';
import type { ResourceKind } from './Inventory';

/** 各道具掉落物的主题色(粒子特效与造型细节共用) */
export const DROP_COLORS: Record<ResourceKind, string> = {
  wood: '#8b5a2b',
  gravel: '#b5b0a8',
  stone: '#9a9a9a',
  berry: '#c0392b',
  fiber: '#a4c46a',
  rope: '#d9c27a',
  fish: '#5fa8d3',
  arrow: '#a97c50',
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

/** 木材:两根交叉叠放的圆木,浅色端面盖 */
function makeWood(): THREE.Object3D {
  const g = new THREE.Group();
  const bark = clay(DROP_COLORS.wood);
  const endMat = clay('#c8a066');
  const log = (len: number, r: number) => {
    const logGroup = new THREE.Group();
    logGroup.add(mesh(new THREE.CylinderGeometry(r, r, len, 6), bark));
    const end1 = mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, 0.02, 6), endMat);
    end1.rotation.x = Math.PI / 2;
    end1.position.y = len / 2;
    const end2 = end1.clone();
    end2.position.y = -len / 2;
    logGroup.add(end1, end2);
    return logGroup;
  };
  const lower = log(0.75, 0.11);
  lower.rotation.z = Math.PI / 2;
  lower.rotation.y = 0.3;
  const upper = log(0.65, 0.1);
  upper.rotation.z = Math.PI / 2;
  upper.rotation.y = -0.2;
  upper.position.y = 0.19;
  g.add(lower, upper);
  return g;
}

/** 碎石:三颗大小不一的碎石块堆在一起 */
function makeGravel(): THREE.Object3D {
  const g = new THREE.Group();
  const mat = clay(DROP_COLORS.gravel);
  const rock = (r: number, x: number, z: number, y: number, ry: number) => {
    const m = mesh(new THREE.DodecahedronGeometry(r, 0), mat);
    m.position.set(x, y, z);
    m.rotation.set(0.3, ry, 0.2);
    return m;
  };
  g.add(rock(0.13, 0, 0, 0.08, 0.5), rock(0.09, 0.18, 0.06, 0.06, 1.4), rock(0.07, -0.14, 0.14, 0.05, 2.3));
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

const BUILDERS: Record<ResourceKind, () => THREE.Object3D> = {
  wood: makeWood,
  gravel: makeGravel,
  stone: makeStone,
  berry: makeBerry,
  fiber: makeFiber,
  rope: makeRope,
  fish: makeFish,
  arrow: makeArrows,
};

/** 按道具种类构建专属掉落物造型(低面数程序化拼装) */
export function makeDropModel(kind: ResourceKind): THREE.Object3D {
  return BUILDERS[kind]();
}
