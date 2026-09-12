import * as THREE from 'three';
import { makeMatureParts } from '../../game/world/TreeModel';
import { mergeClayMeshes } from '../../game/core/mergeClayMeshes';
import type { TreeSpecies } from '../../game/world/TreeSpecies';

/** 独立的营地微缩景观，复用游戏模型，不创建世界或联机状态。 */
export function buildMenuIsland(world: THREE.Group): (time: number) => void {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const add = (geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, parent: THREE.Object3D = world) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
    const mesh = new THREE.Mesh(geometry, materials.get(color)!);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const shore = (angle: number) => 1 + 0.075 * Math.sin(angle * 3 + 0.4) + 0.045 * Math.cos(angle * 5);
  const height = (x: number, z: number) => 0.38 + 0.2 * Math.exp(-((x + 0.8) ** 2 + (z + 0.65) ** 2) / 2) + 0.045 * Math.sin(x * 2 + z);
  // 多圈不规则三角网格：浅滩、沙岸、草地与缓坡自然衔接。
  const vertices: number[] = [], colors: number[] = [], indices: number[] = [];
  const bands = [0, 0.3, 0.58, 0.76, 0.88, 1, 1.08];
  const shades = ['#7cb45b', '#7cb45b', '#6ba04e', '#88b660', '#e8d8a0', '#dac58c', '#ae9868'];
  const segments = 48;
  bands.forEach((radius, ring) => {
    for (let i = 0; i < segments; i++) {
      const angle = i / segments * Math.PI * 2;
      const x = Math.cos(angle) * 3.45 * radius * shore(angle);
      const z = Math.sin(angle) * 2.45 * radius * shore(angle);
      const y = ring < 4 ? height(x, z) : [0.23, 0.02, -0.17][ring - 4];
      vertices.push(x, y, z);
      const color = new THREE.Color(shades[ring]).multiplyScalar(0.97 + Math.sin(i * 7 + ring * 4) * 0.03);
      colors.push(color.r, color.g, color.b);
      if (ring > 0) {
        const a = (ring - 1) * segments + i, b = (ring - 1) * segments + (i + 1) % segments;
        const c = ring * segments + i, d = ring * segments + (i + 1) % segments;
        indices.push(a, b, c, b, d, c);
      }
    }
  });
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  indexed.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  indexed.setIndex(indices);
  const ground = indexed.toNonIndexed();
  indexed.dispose();
  ground.computeVertexNormals();
  world.add(new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));

  const trees: THREE.Group[] = [];
  const planting: [TreeSpecies, number, number, number][] = [
    ['pine', -1.2, -1.1, 1.3], ['oak', -1.8, -0.15, 1.05],
    ['pine', -0.15, -1.55, 1.15], ['oak', 0.7, -1.25, 0.82],
    ['fruit', -0.6, -0.25, 0.78], ['pine', -2.1, -1, 0.72],
  ];
  planting.forEach(([species, x, z, scale]) => {
    const tree = new THREE.Group();
    tree.add(...makeMatureParts(species, true));
    mergeClayMeshes(tree);
    tree.position.set(x, height(x, z), z);
    tree.scale.setScalar(scale);
    world.add(tree);
    trees.push(tree);
  });
  // 岛心留出草地，右后方以层叠岩体平衡左侧树林。
  for (let i = 0; i < 4; i++) {
    const x = 1.1 + i * 0.28, z = -0.55 + (i % 2) * 0.24;
    const rock = add(new THREE.DodecahedronGeometry(0.38 + (3 - i) * 0.09), '#92988a', x, height(x, z) + 0.14, z);
    rock.scale.set(0.8, 1.15 - i * 0.14, 0.85);
    rock.rotation.set(0.1, i * 0.7, 0.15);
  }
  for (let i = 0; i < 12; i++) {
    const angle = i * 2.4;
    const x = Math.cos(angle) * (0.65 + (i % 3) * 0.42);
    const z = Math.sin(angle) * 0.75;
    const tuft = add(new THREE.ConeGeometry(0.07, 0.2, 4), '#729f50', x, height(x, z) + 0.08, z);
    tuft.rotation.z = Math.sin(i) * 0.25;
  }
  for (let i = 0; i < 9; i++) {
    const x = -2.25 + (i % 3) * 0.28 + (i > 5 ? 4.2 : 0);
    const z = 0.55 + Math.floor(i / 3) * 0.25;
    const rock = add(new THREE.DodecahedronGeometry(0.16 + (i % 3) * 0.06), '#8a8a8a', x, 0.36, z);
    rock.scale.set(1, 0.75, 0.85);
    rock.rotation.set(i * 0.3, i, 0.2);
  }
  const fire = new THREE.Group();
  fire.position.set(0.8, height(0.8, 1.1), 1.1);
  world.add(fire);
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2;
    add(new THREE.DodecahedronGeometry(0.075), '#8a8a8a', Math.cos(angle) * 0.27, 0.04, Math.sin(angle) * 0.27, fire);
  }
  for (let i = 0; i < 2; i++) {
    const log = add(new THREE.CylinderGeometry(0.055, 0.065, 0.43, 5), '#785335', 0, 0.06, 0, fire);
    log.rotation.set(Math.PI / 2, 0, i * Math.PI / 2 + 0.4);
  }
  const flame = add(new THREE.ConeGeometry(0.13, 0.42, 5), '#ffb44e', 0, 0.25, 0, fire);
  add(new THREE.ConeGeometry(0.07, 0.25, 5), '#ffe6a0', 0, 0.2, 0.08, fire);
  const waves: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const wave = new THREE.Mesh(new THREE.RingGeometry(1, 1.006, 64), new THREE.MeshBasicMaterial({ color: '#c1ebce', transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
    wave.rotation.x = -Math.PI / 2;
    wave.position.y = -0.12;
    world.add(wave);
    waves.push(wave);
  }
  return (time) => {
    trees.forEach((tree, i) => { tree.rotation.z = Math.sin(time * 1.1 + i * 0.8) * 0.018; });
    flame.scale.y = 1 + Math.sin(time * 9) * 0.14;
    waves.forEach((wave, i) => {
      const pulse = (time * 0.12 + i / 3) % 1;
      wave.scale.set(3.85 + pulse * 0.7, 2.85 + pulse * 0.5, 1);
      (wave.material as THREE.MeshBasicMaterial).opacity = (1 - pulse) * 0.23;
    });
  };
}
