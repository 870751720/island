import * as THREE from 'three';

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 程序化拼装的冶炼炉模型:石砌炉身 + 炉口火光与炉顶排烟口 */
function makeSmelterMesh(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = clayMaterial('#7d8288');
  const darkMat = clayMaterial('#4a4f55');

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.72, 7), stoneMat);
  body.position.y = 0.36;
  body.castShadow = true;
  g.add(body);

  // 炉顶收口
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.18, 7), darkMat);
  rim.position.y = 0.81;
  g.add(rim);

  // 炉门火光:炉内有矿石冶炼时亮起并缓慢闪动
  const fireMat = new THREE.MeshStandardMaterial({
    color: '#e8703a',
    emissive: new THREE.Color('#c0392b'),
    emissiveIntensity: 0.9,
    flatShading: true,
    roughness: 1,
  });
  const fire = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.05), fireMat);
  fire.position.set(0, 0.26, 0.4);
  fire.name = 'smelterFire';
  g.add(fire);

  return g;
}

/**
 * 场景中的冶炼炉摆件:投入的铁矿石每 5 秒炼出 1 块铁锭;
 * 炉内还有矿石时炉门火光发亮闪动,空炉时熄灭。
 */
export class Smelter {
  readonly group: THREE.Group;
  /** 炉内待冶炼的铁矿石数 */
  ore = 0;
  /** 已炼好待收取的铁锭数 */
  ingot = 0;
  /** 距离下一次出炉的剩余秒数(无矿石时为满值) */
  tickLeft = 0;
  private fire: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene, position: THREE.Vector3, rotY = 0) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y -= 0.02;
    this.group.rotation.y = rotY;
    scene.add(this.group);
    const mesh = makeSmelterMesh();
    this.fire = mesh.getObjectByName('smelterFire') ?? null;
    this.group.add(mesh);
  }

  /** 每帧表现:有矿石时炉门火光闪动,空炉时熄灭 */
  update(elapsed: number): void {
    if (!this.fire) return;
    this.fire.visible = this.ore > 0;
    if (this.ore > 0) {
      const mat = (this.fire as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.7 + Math.sin(elapsed * 6) * 0.25;
    }
  }
}
