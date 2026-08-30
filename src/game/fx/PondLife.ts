import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';

/** 水洼水面区域(与 IslandTerrain 内部结构一致) */
interface PondArea {
  x: number;
  z: number;
  radius: number;
  waterY: number;
}

interface Bubble {
  mesh: THREE.Mesh;
  pond: PondArea;
  speed: number;
}

interface Fish {
  group: THREE.Group;
  body: THREE.Mesh;
  pond: PondArea;
  /** 沿圆形路径游动:半径、角速度、相位 */
  orbit: number;
  angularSpeed: number;
  angle: number;
  bobPhase: number;
}

const BUBBLE_GEOMETRY = new THREE.IcosahedronGeometry(0.05, 0);
const FISH_GEOMETRY = new THREE.CircleGeometry(0.22, 8);

/** 水洼环境生物:水面下的小鱼影子与偶尔升起的水底泡泡 */
export class PondLife {
  private bubbles: Bubble[] = [];
  private fishes: Fish[] = [];
  private ponds: PondArea[] = [];
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
    terrain: IslandTerrain
  ) {
    // 每个水洼养 1~2 条鱼:贴着水面下游动,呈深色影子
    for (const pond of terrain.waterAreas as PondArea[]) {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        this.fishes.push(this.createFish(pond, i));
      }
      this.ponds.push(pond);
      this.bubbleTimers.push(Math.random() * 6);
    }
  }

  private createFish(pond: PondArea, index: number): Fish {
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
      orbit: pond.radius * (0.35 + Math.random() * 0.35),
      angularSpeed: (0.25 + Math.random() * 0.3) * (Math.random() < 0.5 ? 1 : -1),
      angle: (index / Math.max(1, 2)) * Math.PI * 2 + Math.random(),
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
        const r = Math.random() * pond.radius * 0.6;
        mesh.position.set(pond.x + Math.cos(a) * r, pond.waterY - 0.8 - Math.random() * 0.4, pond.z + Math.sin(a) * r);
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
      const x = f.pond.x + Math.cos(f.angle) * f.orbit;
      const z = f.pond.z + Math.sin(f.angle) * f.orbit;
      f.group.position.set(x, f.pond.waterY - 0.12 + Math.sin(elapsed * 2 + f.bobPhase) * 0.02, z);
      // 朝向游动方向(group 已绕 X 轴放平,用 Z 轴旋转控制朝向)
      f.group.rotation.z = -f.angle + (f.angularSpeed > 0 ? -Math.PI / 2 : Math.PI / 2);
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
