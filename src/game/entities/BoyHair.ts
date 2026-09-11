import * as THREE from 'three';

export const BOY_HAIR_STYLES = [
  { id: 0, name: '圆寸' },
  { id: 1, name: '锅盖' },
  { id: 2, name: '碎盖' },
  { id: 3, name: '偏分' },
  { id: 4, name: '刺毛' },
  { id: 5, name: '蓬松' },
] as const;

export type BoyHairId = (typeof BOY_HAIR_STYLES)[number]['id'];

export function isBoyHairId(value: number): value is BoyHairId {
  return Number.isInteger(value) && value >= 0 && value < BOY_HAIR_STYLES.length;
}

type Oval = (position: [number, number, number], scale: [number, number, number],
  rotation?: [number, number, number]) => void;
type Shell = (phi: number, deform: (x: number, y: number, z: number) => [number, number, number]) => void;

/** 按编号拼装一款男孩发型；各款合批后只切显隐，不重建头部。 */
export function createBoyHair(style: THREE.Group, material: THREE.MeshStandardMaterial, id: BoyHairId): void {
  const ball = new THREE.SphereGeometry(1, 10, 8);
  const oval: Oval = (position, scale, rotation) => {
    const mesh = new THREE.Mesh(ball.clone().scale(...scale), material);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    style.add(mesh);
  };
  const shell: Shell = (phi, deform) => {
    const geometry = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, phi);
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      positions.setXYZ(i, ...deform(positions.getX(i), positions.getY(i), positions.getZ(i)));
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    style.add(mesh);
  };

  if (id === 0) buzz(shell);
  else if (id === 1) bowl(oval, shell);
  else if (id === 2) crop(oval, shell);
  else if (id === 3) sidePart(oval, shell);
  else if (id === 4) spikes(oval, shell, style, material);
  else fluff(oval, shell);
  ball.dispose();
}

/** 贴头圆寸：低平顶、短侧面、额头全露。 */
function buzz(shell: Shell): void {
  shell(1.32, (x, y, z) => {
    const crown = y * 0.319;
    const top = crown > 0.27 ? 0.303 + (crown - 0.27) * 0.22 : crown + 0.033;
    const back = (1 - z) * 0.5;
    return [x * 0.315, top - back * 0.14 * (1 - y), z * 0.275];
  });
}

/** 锅盖：齐刘海罩到眉上，侧面盖住耳上缘。 */
function bowl(oval: Oval, shell: Shell): void {
  shell(1.55, (x, y, z) => {
    const py = 0.02 + y * 0.275;
    return [x * 0.335, z > 0.35 ? py - 0.02 : py, z * 0.3 + 0.02];
  });
  oval([0, 0.07, 0.255], [0.27, 0.075, 0.07], [0.22, 0, 0]);
  for (const side of [-1, 1] as const) oval([side * 0.29, 0.0, 0.04], [0.07, 0.16, 0.13]);
}

/** 碎盖：圆顶短发加几缕碎刘海。 */
function crop(oval: Oval, shell: Shell): void {
  shell(1.4, (x, y, z) => {
    let py = 0.03 + y * 0.288 + Math.max(0, y - 0.7) * 0.04;
    if (z < 0) py -= (1 - y) * -z * 0.1;
    return [x * 0.322 * (0.96 + y * 0.04), py, z * 0.284 - 0.012];
  });
  oval([-0.05, 0.12, 0.23], [0.15, 0.065, 0.07], [0.4, 0.2, 0.25]);
  oval([0.1, 0.11, 0.232], [0.13, 0.06, 0.068], [0.42, -0.18, -0.1]);
  for (const side of [-1, 1] as const) oval([side * 0.27, -0.01, 0.05], [0.065, 0.14, 0.11]);
}

/** 偏分：发缝靠右，刘海扫向左侧。 */
function sidePart(oval: Oval, shell: Shell): void {
  shell(1.38, (x, y, z) => [x * 0.32 + 0.025 * y, 0.035 + y * 0.29, z * 0.282 - 0.02]);
  oval([0.12, 0.13, 0.22], [0.18, 0.08, 0.085], [0.45, -0.35, -0.2]);
  oval([0.02, 0.1, 0.235], [0.14, 0.07, 0.075], [0.5, -0.15, 0.05]);
  oval([-0.16, 0.08, 0.18], [0.09, 0.09, 0.07], [0.25, 0.35, 0.15]);
  oval([0.28, 0.02, 0.05], [0.075, 0.16, 0.12]);
  oval([-0.255, 0.0, 0.04], [0.06, 0.13, 0.1]);
}

/** 刺毛：短底加上几簇竖起来的发刺。 */
function spikes(oval: Oval, shell: Shell, style: THREE.Group, material: THREE.MeshStandardMaterial): void {
  shell(1.28, (x, y, z) => [x * 0.31, 0.02 + y * 0.255, z * 0.27]);
  for (const side of [-1, 1] as const) oval([side * 0.265, -0.02, 0.03], [0.055, 0.12, 0.1]);
  const tufts: Array<[number, number, number, number, number]> = [
    [0, 0.29, 0.04, 0.08, -0.25],
    [0.09, 0.27, 0.1, 0.07, -0.4],
    [-0.08, 0.275, 0.06, 0.07, -0.32],
    [0.06, 0.26, -0.08, 0.065, 0.15],
    [-0.07, 0.255, -0.07, 0.065, 0.2],
  ];
  for (const [x, y, z, r, pitch] of tufts) {
    const cone = new THREE.ConeGeometry(r, r * 2.1, 5);
    cone.translate(0, r * 1.05, 0);
    const mesh = new THREE.Mesh(cone, material);
    mesh.position.set(x, y, z);
    mesh.rotation.x = pitch;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    style.add(mesh);
  }
}

/** 蓬松：头顶鼓成一团软发，几乎没有刘海。 */
function fluff(oval: Oval, shell: Shell): void {
  shell(1.5, (x, y, z) => {
    const bulge = 1 + Math.max(0, y - 0.2) * 0.12;
    return [x * 0.34 * bulge, 0.05 + y * 0.31, z * 0.3 * bulge];
  });
  oval([0, 0.22, 0.02], [0.22, 0.12, 0.2]);
  oval([0.14, 0.16, 0.12], [0.12, 0.1, 0.11]);
  oval([-0.14, 0.16, 0.1], [0.12, 0.1, 0.11]);
  oval([0, 0.08, -0.18], [0.24, 0.16, 0.14]);
}
