import * as THREE from 'three';
import type { IslandTerrain, WaterArea } from '../world/IslandTerrain';

interface Bubble {
  mesh: THREE.Mesh;
  pond: WaterArea;
  speed: number;
}

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

const BUBBLE_GEOMETRY = new THREE.IcosahedronGeometry(0.05, 0);
const FISH_GEOMETRY = new THREE.CircleGeometry(0.22, 8);

/** 局部坐标(洼心为原点、已按洼朝向旋转)转世界坐标 */
function toWorld(pond: WaterArea, lx: number, lz: number): [number, number] {
  const ca = Math.cos(pond.rot);
  const sa = Math.sin(pond.rot);
  return [pond.x + lx * ca - lz * sa, pond.z + lx * sa + lz * ca];
}

/** 水洼环境生物:水面下的小鱼影子与偶尔升起的水底泡泡;
 *  位置都按水洼真实边界(椭圆 + 角向起伏)取点,贴合不规则形状 */
export class PondLife {
  private bubbles: Bubble[] = [];
  private fishes: Fish[] = [];
  private ponds: WaterArea[] = [];
  /** 每个水洼独立的冒泡计时器 */
  private bubbleTimers: number[] = [];
  private readonly bubbleMaterial = new THREE.MeshBasicMaterial({
    color: '#eaf7ff',
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
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
      this.ponds.push(pond);
      this.bubbleTimers.push(Math.random() * 6);
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
    this.updateBubbles(delta);
    this.updateFishes(delta, elapsed);
  }

  /** 每个水洼各自每 2~6 秒在底部冒一小串泡泡,浮到水面即消散 */
  private updateBubbles(delta: number): void {
    for (let p = 0; p < this.ponds.length; p++) {
      this.bubbleTimers[p] -= delta;
      if (this.bubbleTimers[p] > 0) continue;
      this.bubbleTimers[p] = 2 + Math.random() * 4;
      const pond = this.ponds[p];
      for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
        const mesh = new THREE.Mesh(BUBBLE_GEOMETRY, this.bubbleMaterial.clone());
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.6 * this.terrain.pondEdgeRadius(pond, a);
        const [x, z] = toWorld(pond, Math.cos(a) * r, Math.sin(a) * r);
        mesh.position.set(x, pond.waterY - 0.8 - Math.random() * 0.4, z);
        mesh.scale.setScalar(0.5 + Math.random() * 0.7);
        this.scene.add(mesh);
        this.bubbles.push({ mesh, pond, speed: 0.25 + Math.random() * 0.15 });
      }
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.mesh.position.y += b.speed * delta;
      // 轻微左右漂移,模拟水下扰动
      b.mesh.position.x += Math.sin(b.mesh.position.y * 12) * 0.1 * delta;
      const t = THREE.MathUtils.clamp((b.mesh.position.y - (b.pond.waterY - 1)) / 1, 0, 1);
      (b.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * Math.min(1, t * 3) * (1 - Math.max(0, t - 0.85) / 0.15);
      if (b.mesh.position.y >= b.pond.waterY - 0.05) {
        this.scene.remove(b.mesh);
        (b.mesh.material as THREE.Material).dispose();
        this.bubbles.splice(i, 1);
      }
    }
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
    for (const b of this.bubbles) {
      this.scene.remove(b.mesh);
      (b.mesh.material as THREE.Material).dispose();
    }
    for (const f of this.fishes) this.scene.remove(f.group);
    this.bubbleMaterial.dispose();
    this.fishMaterial.dispose();
  }
}
