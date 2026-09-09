import * as THREE from 'three';
import { clayMaterial } from '../world/ClayMaterial';


/** 程序化拼装的海水净化器模型:铁皮机身 + 顶部漏斗 + 玻璃净水槽 + 插进湿沙的汲水管 */
function makePurifierMesh(): THREE.Group {
  const g = new THREE.Group();
  const ironMat = clayMaterial('#9aa3ab');
  const darkMat = clayMaterial('#697076');

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.5, 9), ironMat);
  body.position.y = 0.25;
  body.castShadow = true;
  g.add(body);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 9), darkMat);
  base.position.y = 0.03;
  g.add(base);

  // 顶部漏斗:海风带来的湿气与倒进的海水从这里进
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.1, 0.18, 9), ironMat);
  funnel.position.y = 0.59;
  funnel.castShadow = true;
  g.add(funnel);

  // 侧面玻璃净水槽:浅蓝的水面缓慢起伏
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.24, 9),
    new THREE.MeshStandardMaterial({
      color: '#bfe3ea',
      transparent: true,
      opacity: 0.45,
      flatShading: true,
      roughness: 0.3,
    })
  );
  tank.position.set(0.24, 0.3, 0.14);
  g.add(tank);

  const waterMat = new THREE.MeshStandardMaterial({
    color: '#3fa7d6',
    transparent: true,
    opacity: 0.85,
    flatShading: true,
    roughness: 0.4,
  });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 9), waterMat);
  water.position.set(0.24, 0.28, 0.14);
  water.name = 'cleanWater';
  g.add(water);

  // 汲水管:斜插进湿沙汲取海水
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 6), darkMat);
  pipe.rotation.z = Math.PI / 3.4;
  pipe.position.set(-0.28, 0.16, -0.16);
  g.add(pipe);

  return g;
}

/**
 * 场景中的海水净化器摆件:放在湿沙滩上,把海水慢慢滤成清水;
 * 玩家靠近后站定即可像水洼一样自动喝水,玻璃槽内水面轻微起伏。
 */
export class WaterPurifier {
  readonly group: THREE.Group;
  private water: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene, position: THREE.Vector3, rotY = 0) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y -= 0.02;
    this.group.rotation.y = rotY;
    scene.add(this.group);
    const mesh = makePurifierMesh();
    this.water = mesh.getObjectByName('cleanWater') ?? null;
    this.group.add(mesh);
  }

  /** 每帧表现:净水槽水面轻微起伏 */
  update(elapsed: number): void {
    if (!this.water) return;
    this.water.position.y = 0.28 + Math.sin(elapsed * 1.6) * 0.015;
    this.water.rotation.y = elapsed * 0.4;
  }
}
