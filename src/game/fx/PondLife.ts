import * as THREE from 'three';
import type { IslandTerrain, WaterArea } from '../world/IslandTerrain';

interface Fish {
  group: THREE.Group;
  body: THREE.Mesh;
  pond: WaterArea;
  /** 沿洼形轨道游动:局部角度、半径占该方向边界半径的比例、角速度、相位 */
  angle: number;
  orbitFactor: number;
  angularSpeed: number;
  bobPhase: number;
}

const FISH_GEOMETRY = new THREE.CircleGeometry(0.22, 8);

/** 局部坐标(洼心为原点、已按洼朝向旋转)转世界坐标 */
function toWorld(pond: WaterArea, lx: number, lz: number): [number, number] {
  const ca = Math.cos(pond.rot);
  const sa = Math.sin(pond.rot);
  return [pond.x + lx * ca - lz * sa, pond.z + lx * sa + lz * ca];
}

/** 水洼环境生物:水面下游动的小鱼影子;
 *  位置都按水洼真实边界(椭圆 + 角向起伏)取点,贴合不规则形状 */
export class PondLife {
  private fishes: Fish[] = [];
  private readonly fishMaterial = new THREE.MeshBasicMaterial({
    color: '#1e3440',
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain
  ) {
    // 每个水洼养 1~2 条鱼:贴着水面下游动,呈深色影子
    for (const pond of terrain.waterAreas) {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        this.fishes.push(this.createFish(pond, i));
      }
    }
  }

  private createFish(pond: WaterArea, index: number): Fish {
    const group = new THREE.Group();
    const body = new THREE.Mesh(FISH_GEOMETRY, this.fishMaterial);
    body.scale.set(1, 0.45, 1);
    group.add(body);
    // 小尾巴:更小的一片,游动时左右摆
    const tail = new THREE.Mesh(FISH_GEOMETRY, this.fishMaterial);
    tail.scale.set(0.45, 0.3, 1);
    tail.position.x = -0.28;
    group.add(tail);
    group.rotation.x = -Math.PI / 2;
    this.scene.add(group);
    return {
      group,
      body,
      pond,
      angle: (index / Math.max(1, 2)) * Math.PI * 2 + Math.random(),
      orbitFactor: 0.3 + Math.random() * 0.4,
      angularSpeed: (0.25 + Math.random() * 0.3) * (Math.random() < 0.5 ? 1 : -1),
      bobPhase: Math.random() * Math.PI * 2,
    };
  }

  update(delta: number, elapsed: number): void {
    this.updateFishes(delta, elapsed);
  }

  private updateFishes(delta: number, elapsed: number): void {
    for (const f of this.fishes) {
      f.angle += f.angularSpeed * delta;
      // 轨道半径按当前方向的洼边界取比例,扁洼里鱼走扁圈,始终在水内
      const r = this.terrain.pondEdgeRadius(f.pond, f.angle) * f.orbitFactor;
      const [x, z] = toWorld(f.pond, Math.cos(f.angle) * r, Math.sin(f.angle) * r);
      const prevX = f.group.position.x;
      const prevZ = f.group.position.z;
      f.group.position.set(x, f.pond.waterY - 0.12 + Math.sin(elapsed * 2 + f.bobPhase) * 0.02, z);
      // 朝向按实际位移方向计算(group 已绕 X 轴放平,椭圆轨道的切向不再等于轨道角)
      const dx = x - prevX;
      const dz = z - prevZ;
      if (dx * dx + dz * dz > 1e-8) f.group.rotation.z = -Math.atan2(dz, dx);
      // 身体轻微摆尾
      f.body.rotation.y = Math.sin(elapsed * 6 + f.bobPhase) * 0.25;
    }
  }

  dispose(): void {
    for (const f of this.fishes) this.scene.remove(f.group);
    this.fishMaterial.dispose();
  }
}
