import * as THREE from 'three';

const FULL_FUEL = 210; // 火焰达到满簇满尺寸/满亮度的参考燃料秒数
const LOW_FUEL = 12; // 剩余低于该秒数算濒熄:火苗缩小、剧烈闪烁

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
 * 火堆摆件:石圈 + 交叉架起的木柴,燃着时表现随剩余燃料多寡变化——火焰
 * 簇数分档(>210s 四簇 / >150s 三簇 / >30s 两簇 / 更少一簇),整团火焰大小
 * 与灯光亮度、照射范围随燃料连续收缩,柴堆随之变矮,炊烟袅袅;濒熄
 * (低于 12s)时火苗剧烈明灭,燃尽后火苗熄灭、石圈和木柴留在原地,添柴即可复燃。
 * 外部只读 fuel 并调用 update,由系统负责加入与移除。
 */
export class Campfire {
  readonly group: THREE.Group;
  private flames: THREE.Mesh[] = [];
  private fireRoot: THREE.Group;
  private smoke: { mesh: THREE.Mesh; offset: number }[] = [];
  private light: THREE.PointLight;
  private logs: THREE.Group;
  private logMat: THREE.MeshStandardMaterial;
  private charredMat: THREE.MeshStandardMaterial;
  /** 剩余燃烧秒数,> 0 即在燃烧 */
  fuel: number;

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
    this.logMat = clayMaterial('#7a5230');
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 5), this.logMat);
      const a = (i / 3) * Math.PI;
      log.rotation.set(Math.PI / 2 - 0.5, a, 0);
      log.position.y = 0.15;
      log.castShadow = true;
      this.logs.add(log);
    }
    this.group.add(this.logs);

    // 火焰:四簇橙黄色锥体挂在独立组下(整组随燃料缩放),按燃料阶段决定显示几簇
    this.fireRoot = new THREE.Group();
    const flameColors = ['#ff9d2e', '#ffcf5e', '#ff6a2e', '#ffb35e'];
    for (let i = 0; i < 4; i++) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.14 - (i % 3) * 0.03, 0.5 - (i % 3) * 0.1, 5),
        clayMaterial(flameColors[i], 0.9)
      );
      const angle = (i / 4) * Math.PI * 2;
      flame.position.set(Math.cos(angle) * 0.12, 0.35, Math.sin(angle) * 0.12);
      this.flames.push(flame);
      this.fireRoot.add(flame);
    }
    this.group.add(this.fireRoot);
    this.light = new THREE.PointLight('#ff9d2e', 1.4, 6, 1.5);
    this.light.position.y = 0.7;
    this.group.add(this.light);

    // 炊烟:三个错相循环上升并消散的烟团
    const smokeMat = new THREE.MeshBasicMaterial({
      color: '#9a958c',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    for (let i = 0; i < 3; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), smokeMat.clone());
      puff.visible = false;
      this.group.add(puff);
      this.smoke.push({ mesh: puff, offset: i / 3 });
    }

    // 燃尽时柴堆换成烧焦色,示意熄灭但还能添柴复燃
    this.charredMat = clayMaterial('#2e2a26');
    this.group.position.y -= 0.05;
    scene.add(this.group);
    if (initialFuel > 0) this.applyStage();
    else this.extinguish();
  }

  get isLit(): boolean {
    return this.fuel > 0;
  }

  update(delta: number, elapsed: number): void {
    if (!this.isLit) return;
    this.fuel = Math.max(0, this.fuel - delta);
    // 濒熄时火苗抖得更快更慌,平时慢悠悠地摇
    const low = this.fuel < LOW_FUEL;
    const flickerSpeed = low ? 16 : 9;
    for (let i = 0; i < this.flames.length; i++) {
      const flicker = 1 + Math.sin(elapsed * flickerSpeed + i * 2.4) * (low ? 0.28 : 0.12);
      this.flames[i].scale.set(flicker, 1 + Math.sin(elapsed * 12 + i) * 0.18, flicker);
    }
    // 灯光亮度与照射范围随燃料伸缩,濒熄时剧烈明灭
    const k = Math.min(this.fuel / FULL_FUEL, 1);
    const wobble = low ? Math.sin(elapsed * 18) * 0.5 : Math.sin(elapsed * 10) * 0.15;
    this.light.intensity = Math.max(0.3 + k * 1.7 + wobble, 0.1);
    this.light.distance = 3.5 + k * 5.5;
    this.updateSmoke(elapsed);
    if (this.fuel <= 0) this.extinguish();
    else this.applyStage();
  }

  /** 炊烟:烟团从火心上方升到高处,边升边胀大淡出,各错开相位循环 */
  private updateSmoke(elapsed: number): void {
    const smokeScale = 0.7 + Math.min(this.fuel / FULL_FUEL, 1) * 0.5;
    for (const { mesh, offset } of this.smoke) {
      const t = (elapsed * 0.22 + offset) % 1;
      mesh.visible = this.isLit;
      mesh.position.set(Math.sin((elapsed + offset * 9) * 1.3) * 0.08 * t, 0.55 + t * 0.9, 0);
      mesh.scale.setScalar((0.5 + t * 1.6) * smokeScale);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - t) * Math.min(t * 4, 1);
    }
  }

  /** 燃料阶段变化时切换表现:簇数分档,整团火焰大小连续随燃料收缩,柴堆随之变矮 */
  private applyStage(): void {
    const stage = this.fuel > 150 ? (this.fuel > 210 ? 4 : 3) : this.fuel > 30 ? 2 : 1;
    for (let i = 0; i < this.flames.length; i++) {
      this.flames[i].visible = i < stage;
    }
    // 满柴(210s)时是低燃料时的一半基准再放大到两倍:0.5 → 2.0
    const size = 0.5 + Math.min(this.fuel / FULL_FUEL, 1) * 1.5;
    this.fireRoot.scale.setScalar(size);
    this.logs.scale.y = Math.max(0.4, size);
    this.logs.scale.x = this.logs.scale.z = Math.max(0.7, 0.6 + size * 0.4);
  }

  private extinguish(): void {
    for (const flame of this.flames) flame.visible = false;
    for (const { mesh } of this.smoke) mesh.visible = false;
    this.light.visible = false;
    this.logs.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.material = this.charredMat;
    });
  }

  /** 复燃:添柴后恢复木柴原色与火焰表现 */
  relight(): void {
    this.light.visible = true;
    this.logs.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.material = this.logMat;
    });
    this.applyStage();
  }

  dispose(): void {
    this.charredMat.dispose();
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}
