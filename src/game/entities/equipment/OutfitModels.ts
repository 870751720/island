import * as THREE from 'three';
import { ClayParts } from './ClayParts';

export type OutfitTier = 0 | 1 | 2;
const CREAM = '#f6e7c5';
const BRASS = '#dfb96c';
const LEATHER = '#77503d';
const PALETTES = [
  { main: '#81976b', dark: '#526952', accent: '#d18b61', bag: '#d6b47c' },
  { main: '#b77d55', dark: '#674d43', accent: '#708f8a', bag: '#a66b49' },
  { main: '#6dada6', dark: '#3f6f6b', accent: '#e6d2a4', bag: '#d7c196' },
] as const;

/** 帽子使用头部局部坐标；帽口包住发帽，前沿高于刘海和眼睛。 */
export function makeOutfitHat(tier: OutfitTier): THREE.Group {
  const b = new ClayParts();
  const p = PALETTES[tier];
  if (tier === 0) {
    b.add(p.bag, new THREE.CylinderGeometry(0.45, 0.47, 0.037, 16),
      [0, 0.175, 0], [1, 1, 0.87]);
    b.add(p.bag, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      [0, 0.175, 0], [0.343, 0.235, 0.305]);
    b.ring(p.dark, [0, 0.207, 0], 0.327, 0.026, [1, 0.9, 1]);
    b.oval(p.main, [-0.278, 0.243, 0.2], [0.055, 0.115, 0.022], [0, 0, -0.65]);
    b.box(CREAM, [-0.238, 0.202, 0.255], [0.07, 0.045, 0.025], [0, -0.5, 0]);
  } else if (tier === 1) {
    // 皮质报童帽：偏斜软冠、短鸭舌和深棕色帽带。
    b.add(p.main, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      [-0.025, 0.16, -0.012], [0.36, 0.245, 0.315], [0, 0, 0.08]);
    b.ring(p.dark, [0, 0.17, 0], 0.321, 0.029, [1, 0.91, 1]);
    b.oval(p.main, [0, 0.155, 0.25], [0.287, 0.028, 0.175], [-0.08, 0, 0]);
    b.oval(p.dark, [-0.03, 0.408, -0.012], [0.033, 0.017, 0.03]);
    b.box(BRASS, [-0.23, 0.194, 0.235], [0.07, 0.04, 0.023], [0, -0.55, 0]);
  } else {
    // 海沫水手帽：帽冠帽檐尺寸与一级草帽相同，包住发帽；只换奶油布与海沫帽带。
    b.add(CREAM, new THREE.CylinderGeometry(0.45, 0.47, 0.037, 16),
      [0, 0.175, 0], [1, 1, 0.87]);
    b.add(CREAM, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      [0, 0.175, 0], [0.343, 0.235, 0.305]);
    b.ring(p.main, [0, 0.207, 0], 0.327, 0.026, [1, 0.9, 1]);
    b.box(p.dark, [0.03, 0.16, -0.332], [0.038, 0.11, 0.014], [0.45, 0, 0]);
    b.box(p.dark, [-0.03, 0.15, -0.326], [0.036, 0.09, 0.013], [0.62, 0, 0]);
    b.box(BRASS, [-0.238, 0.202, 0.255], [0.07, 0.045, 0.025], [0, -0.5, 0]);
  }
  return b.finish();
}

/** 身体装饰使用人物根坐标，袖口独立挂肩关节。 */
export function makeOutfitShirt(tier: OutfitTier): THREE.Group {
  const b = new ClayParts();
  const p = PALETTES[tier];
  if (tier === 0) {
    b.ring(CREAM, [0, 1.065, 0], 0.105, 0.027, [1, 0.82, 1]);
    for (const side of [-1, 1]) {
      b.box(p.accent, [side * 0.047, 1.016, 0.118], [0.079, 0.105, 0.032], [0.25, 0, side * -0.48]);
    }
    b.oval(BRASS, [0, 0.98, 0.15], [0.026, 0.025, 0.02]);
    b.box(p.dark, [-0.113, 0.84, 0.142], [0.1, 0.107, 0.028]);
    b.box(CREAM, [-0.113, 0.88, 0.161], [0.106, 0.025, 0.017]);
  } else if (tier === 1) {
    for (const side of [-1, 1]) {
      b.oval(p.main, [side * 0.127, 0.855, 0.06], [0.133, 0.231, 0.131]);
      b.box(CREAM, [side * 0.076, 1.008, 0.116],
        [0.085, 0.13, 0.043], [0.22, 0, side * -0.42]);
      b.box(p.dark, [side * 0.127, 0.758, 0.159], [0.11, 0.082, 0.034]);
      b.box(p.main, [side * 0.127, 0.795, 0.18], [0.116, 0.022, 0.023]);
    }
    b.box(p.dark, [0, 0.866, 0.173], [0.018, 0.22, 0.02]);
    for (const y of [0.92, 0.84]) b.oval(BRASS, [0, y, 0.192], [0.014, 0.015, 0.009]);
  } else {
    b.ring(CREAM, [0, 1.065, 0], 0.108, 0.024, [1, 0.82, 1]);
    for (const side of [-1, 1]) {
      b.box(CREAM, [side * 0.058, 1.014, 0.12], [0.1, 0.128, 0.034], [0.22, 0, side * -0.44]);
    }
    b.box(CREAM, [0, 1.02, -0.11], [0.24, 0.1, 0.036]);
    b.box(p.dark, [0, 0.968, 0.146], [0.072, 0.092, 0.03], [0.32, 0, 0]);
    b.oval(BRASS, [0, 0.942, 0.164], [0.02, 0.02, 0.014]);
    b.box(p.dark, [-0.113, 0.84, 0.142], [0.1, 0.1, 0.028]);
    b.box(CREAM, [-0.113, 0.878, 0.16], [0.106, 0.024, 0.016]);
  }
  return b.finish();
}

export function makeOutfitSleeve(tier: OutfitTier): THREE.Group {
  const b = new ClayParts();
  b.ring(CREAM, [0, -0.102, 0], 0.086, 0.017);
  if (tier === 2) b.ring(PALETTES[tier].dark, [0, -0.086, 0], 0.078, 0.009);
  return b.finish();
}

export function makeOutfitWaist(tier: OutfitTier): THREE.Group {
  const b = new ClayParts();
  b.ring(LEATHER, [0, 0.64, 0], 0.203, 0.026, [1, 0.73, 1]);
  b.box(BRASS, [0, 0.64, 0.16], [0.067, 0.049, 0.021]);
  b.box(PALETTES[tier].dark, [0, 0.64, 0.174], [0.034, 0.023, 0.01]);
  return b.finish();
}

/** 短裤保留儿童比例；口袋与卷边随各自髋关节摆动。 */
export function makeOutfitTrouserLeg(tier: OutfitTier, side: number): THREE.Group {
  const b = new ClayParts();
  const p = PALETTES[tier];
  b.ring(tier === 0 ? p.main : CREAM, [0, -0.177, 0], 0.09, 0.022, [1, 1.13, 1]);
  b.box(tier === 0 ? p.main : p.dark, [side * 0.076, -0.088, 0.075],
    [0.07, 0.11, 0.053], [0, side * 0.45, 0]);
  b.box(tier === 0 ? CREAM : p.main, [side * 0.079, -0.047, 0.095],
    [0.076, 0.027, 0.024], [0, side * 0.45, 0]);
  if (tier === 2) {
    b.box(CREAM, [side * 0.092, -0.082, 0.012], [0.018, 0.155, 0.036]);
  }
  return b.finish();
}

/** 背包以根坐标建模，贴背短包体与肩带避开手臂，装饰朝向 -Z。 */
export function makeOutfitBackpack(tier: OutfitTier): THREE.Group {
  const b = new ClayParts();
  const p = PALETTES[tier];
  const width = tier === 0 ? 0.32 : 0.37;
  b.box(p.bag, [0, 0.817, -0.257], [width, 0.355, 0.204]);
  b.box(tier === 2 ? p.main : p.dark, [0, 0.952, -0.288], [width + 0.012, 0.118, 0.185]);
  b.box(p.main, [0, 0.748, -0.373], [width * 0.7, 0.124, 0.064]);
  b.box(CREAM, [0, 0.796, -0.41], [width * 0.66, 0.018, 0.015]);
  for (const side of [-1, 1]) {
    b.box(LEATHER, [side * 0.092, 0.881, -0.39], [0.035, 0.18, 0.025]);
    b.box(BRASS, [side * 0.092, 0.846, -0.407], [0.05, 0.04, 0.015]);
    // 连续椭圆肩带绕过肩部并落在胸前，避免只有背后两根悬空竖条。
    b.ring(LEATHER, [side * 0.18, 0.87, -0.013], 0.175, 0.016,
      [1.23, 1.18, 1], [0, Math.PI / 2, 0]);
  }
  b.ring(LEATHER, [0, 1.015, -0.242], 0.052, 0.014, [1, 0.75, 1], [0, 0, 0]);
  if (tier === 0) {
    b.oval(p.main, [0.083, 0.963, -0.387], [0.032, 0.058, 0.012], [0, 0, -0.55]);
  } else {
    b.add(p.accent, new THREE.CylinderGeometry(0.062, 0.062, 0.35, 10),
      [0, 1.04, -0.255], [1, 1, 1], [0, 0, Math.PI / 2]);
    for (const x of [-0.104, 0.104]) {
      b.ring(LEATHER, [x, 1.04, -0.255], 0.063, 0.012, [1, 1, 1], [0, Math.PI / 2, 0]);
    }
    if (tier === 2) {
      b.oval(p.main, [0.09, 0.74, -0.392], [0.03, 0.052, 0.012], [0, 0, -0.5]);
    }
  }
  return b.finish();
}
