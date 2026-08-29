import * as THREE from 'three';

const ASH_TIME = 10; // 灰烬存留秒数

function clayMaterial(color: string, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
    emissive: new THREE.Color(color),
    emissiveIntensity: emissive,
  });
}

/**
 * 火堆摆件:石圈 + 交叉架起的木柴,燃着时火焰随剩余燃料多寡增减,
 * 燃尽后火焰熄灭只剩一小堆灰烬,灰烬倒计时后整堆消失。
 * 外部只读 fuel / spent 并调用 update,由系统负责加入与移除。
 */
export class Campfire {
  readonly group: THREE.Group;
  private flames: THREE.Mesh[] = [];
  private light: THREE.PointLight;
  private ash: THREE.Group;
  private logs: THREE.Group;
  /** 剩余燃烧秒数,> 0 即在燃烧 */
  fuel: number;
  /** 燃尽后灰烬剩余的存留秒数;未燃尽时为 null */
  ashLeft: number | null = null;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    /** 制作完成时的初始燃料(秒) */
    initialFuel: number
  ) {
    this.fuel = initialFuel;
    this.group = new THREE.Group();
    this.group.position.copy(position);

    // 石圈
    const stoneMat = clayMaterial('#8d8a82');
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), stoneMat);
      stone.position.set(Math.cos(a) * 0.55, 0.05, Math.sin(a) * 0.55);
      stone.rotation.set(0.3, a, 0.2);
      stone.castShadow = true;
      this.group.add(stone);
    }

    // 交叉架起的木柴
    this.logs = new THREE.Group();
    const logMat = clayMaterial('#7a5230');
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 5), logMat);
      const a = (i / 3) * Math.PI;
      log.rotation.set(Math.PI / 2 - 0.5, a, 0);
      log.position.y = 0.15;
      log.castShadow = true;
      this.logs.add(log);
    }
    this.group.add(this.logs);

    // 火焰:三簇橙黄色锥体,按燃料阶段决定显示几簇
    const flameColors = ['#ff9d2e', '#ffcf5e', '#ff6a2e'];
    for (let i = 0; i < 3; i++) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.14 - i * 0.03, 0.5 - i * 0.1, 5),
        clayMaterial(flameColors[i], 0.9)
      );
      flame.position.set((i - 1) * 0.1, 0.35, (i % 2) * 0.08 - 0.04);
      this.flames.push(flame);
      this.group.add(flame);
    }
    this.light = new THREE.PointLight('#ff9d2e', 1.4, 6, 1.5);
    this.light.position.y = 0.7;
    this.group.add(this.light);

    // 灰烬:燃尽后替代火焰显示
    this.ash = new THREE.Group();
    const ashMat = clayMaterial('#6f6a63');
    const pile = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.18, 6), ashMat);
    pile.position.y = 0.09;
    this.ash.add(pile);
    for (let i = 0; i < 3; i++) {
      const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06, 0), clayMaterial('#3a3733'));
      chunk.position.set(Math.cos(i * 2.1) * 0.28, 0.06, Math.sin(i * 2.1) * 0.28);
      this.ash.add(chunk);
    }
    this.ash.visible = false;
    this.group.add(this.ash);

    this.group.position.y -= 0.05;
    scene.add(this.group);
    this.applyStage();
  }

  get isLit(): boolean {
    return this.fuel > 0;
  }

  /** 已燃尽且灰烬倒计时结束,应从场上移除 */
  get spent(): boolean {
    return this.ashLeft !== null && this.ashLeft <= 0;
  }

  update(delta: number, elapsed: number): void {
    if (this.isLit) {
      this.fuel = Math.max(0, this.fuel - delta);
      // 火苗摇曳:轻微缩放抖动,各簇相位错开
      for (let i = 0; i < this.flames.length; i++) {
        const flicker = 1 + Math.sin(elapsed * 9 + i * 2.4) * 0.12;
        this.flames[i].scale.set(flicker, 1 + Math.sin(elapsed * 12 + i) * 0.18, flicker);
      }
      this.light.intensity = 1.2 + Math.sin(elapsed * 10) * 0.25;
      if (this.fuel <= 0) this.extinguish();
      else this.applyStage();
    } else if (this.ashLeft !== null) {
      // 灰烬在消失前渐渐缩没
      this.ashLeft -= delta;
      const k = Math.max(this.ashLeft, 0) / ASH_TIME;
      this.ash.scale.setScalar(Math.max(k, 0.01));
    }
  }

  /** 燃料阶段变化时切换火焰簇数:燃料越少火越小 */
  private applyStage(): void {
    const stage = this.fuel > 60 ? 3 : this.fuel > 20 ? 2 : 1;
    for (let i = 0; i < this.flames.length; i++) {
      this.flames[i].visible = i < stage;
    }
  }

  private extinguish(): void {
    for (const flame of this.flames) flame.visible = false;
    this.light.visible = false;
    this.logs.visible = false;
    this.ash.visible = true;
    this.ashLeft = ASH_TIME;
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}
