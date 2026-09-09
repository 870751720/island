import * as THREE from 'three';

const SAMPLES = 9;
/** 复用小型带状网格，沿真实剑刃位置留下短促加色闪光，不使用灯光或后处理。 */
export class SwordTrail {
  private readonly positions = new Float32Array(SAMPLES * 6);
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material = new THREE.MeshBasicMaterial({
    color: '#fff3b5', side: THREE.DoubleSide, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  private readonly mesh = new THREE.Mesh(this.geometry, this.material);
  private readonly point = new THREE.Vector3();
  private count = 0;
  private fade = 0;
  private previousTime = 0;

  constructor(private parent: THREE.Group) {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    const indices: number[] = [];
    for (let i = 0; i < SAMPLES - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.geometry.setIndex(indices);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    parent.add(this.mesh);
  }

  update(delta: number, sword: THREE.Group | null, time: number): void {
    if (sword && time < this.previousTime) this.clear();
    this.previousTime = sword ? time : 0;
    if (sword && time >= 0.03 && time <= 0.28) {
      this.positions.copyWithin(6, 0, (SAMPLES - 1) * 6);
      // 剑刃根部到尖端旁边的亮带，随工具等级模型一起运动。
      for (let i = 0; i < 2; i++) {
        this.point.set(0.035, i === 0 ? 0.13 : 0.48, 0.015);
        sword.localToWorld(this.point);
        this.parent.worldToLocal(this.point);
        this.point.toArray(this.positions, i * 3);
      }
      this.count = Math.min(SAMPLES, this.count + 1);
      this.fade = 0.12;
      this.material.opacity = 0.6 + Math.sin(time * 95) * 0.2;
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.setDrawRange(0, Math.max(0, this.count - 1) * 6);
    } else {
      this.fade = Math.max(0, this.fade - delta);
      this.material.opacity = this.fade / 0.12 * 0.6;
      if (this.fade === 0) this.count = 0;
    }
    this.mesh.visible = this.count > 1 && this.fade > 0;
  }

  clear(): void {
    this.count = this.fade = this.previousTime = 0;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
