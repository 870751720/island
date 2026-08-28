import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';

interface Footprint {
  mesh: THREE.Mesh;
  life: number;
}

const LIFETIME = 4;
const FADE_TIME = 1.5;
/** 椭圆脚印:窄长圆面片平贴地面 */
const FOOT_GEOMETRY = new THREE.CircleGeometry(0.09, 10).scale(1, 1.8, 1);

/** 走路脚印:每隔一步在地面留一枚深色椭圆印,几秒后淡出消失 */
export class Footprints {
  private prints: Footprint[] = [];

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain
  ) {}

  /** 在给定位置与朝向下留一枚脚印,left 控制左右脚横向偏移 */
  step(x: number, z: number, headingY: number, left: boolean): void {
    const mesh = new THREE.Mesh(
      FOOT_GEOMETRY,
      new THREE.MeshBasicMaterial({
        color: '#6b5436',
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      })
    );
    // 印在脚掌落点:沿朝向略靠前,左右交替偏移
    const side = left ? -1 : 1;
    const forward = new THREE.Vector2(Math.sin(headingY), Math.cos(headingY));
    const lateral = new THREE.Vector2(forward.y, -forward.x);
    mesh.position.set(
      x + lateral.x * side * 0.09 + forward.x * 0.08,
      this.terrain.getHeight(x, z) + 0.02,
      z + lateral.y * side * 0.09 + forward.y * 0.08
    );
    mesh.rotation.set(-Math.PI / 2, 0, 0);
    // 椭圆长轴初始指向世界 -Z,旋转到行进方向
    mesh.rotateZ(Math.PI + headingY);
    this.scene.add(mesh);
    this.prints.push({ mesh, life: LIFETIME });
  }

  update(delta: number): void {
    for (let i = this.prints.length - 1; i >= 0; i--) {
      const f = this.prints[i];
      f.life -= delta;
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        (f.mesh.material as THREE.Material).dispose();
        this.prints.splice(i, 1);
        continue;
      }
      if (f.life < FADE_TIME) {
        (f.mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 * (f.life / FADE_TIME);
      }
    }
  }

  dispose(): void {
    for (const f of this.prints) {
      this.scene.remove(f.mesh);
      (f.mesh.material as THREE.Material).dispose();
    }
    this.prints = [];
  }
}
