import * as THREE from 'three';
import { clayMaterial } from './ClayMaterial';
import type { TreeSpecies } from './TreeSpecies';

const CROWN_COLORS: Record<TreeSpecies, string> = {
  oak: '#3f7d33',
  pine: '#2e6b3d',
  fruit: '#4f8f3a',
};

/** 落叶植被专用材质:与树冠同色,冬季随雪量转枯黄 */
function leafMaterial(color: string): THREE.MeshStandardMaterial {
  return clayMaterial(color, true);
}

/** 成树:按树种拼装三种造型;果树按挂果状态决定是否点缀红果 */
export function makeMatureParts(species: TreeSpecies, withFruit: boolean): THREE.Mesh[] {
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
        new THREE.Mesh(new THREE.ConeGeometry(r, 0.7 - i * 0.12, 6), clayMaterial(CROWN_COLORS.pine))
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
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafMaterial(crownColor));
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
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 0), leafMaterial(crownColor));
  crown.position.y = 1.2;
  const crown2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 0),
    leafMaterial('#4f9440')
  );
  crown2.position.set(0.15, 1.65, 0.1);
  return [trunk, crown, crown2];
}

