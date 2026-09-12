import * as THREE from 'three';
import { createRippleMaterial } from './RippleMaterial';

interface Ripple {
  mesh: THREE.Mesh;
  life: number;
  size: number;
}

const RIPPLE_LIFETIME = 1.2;
const RIPPLE_MAX_SCALE = 1.6;
const RIPPLE_GEOMETRY = new THREE.PlaneGeometry(2, 2);
const MAX_RIPPLES = 64;

/** 水面交互特效:入水水花与扩散消散的细弧波纹 */
export class WaterFx {
  private ripples: Ripple[] = [];
  private rippleTimer = 0;

  constructor(
    private scene: THREE.Scene,
    private particles: { burst: (position: THREE.Vector3, color: string, count?: number) => void }
  ) {}

  /** 在水面位置泛起两道断续细波 */
  ripple(x: number, y: number, z: number, size = 1): void {
    if (this.ripples.length >= MAX_RIPPLES) return;
    const mesh = new THREE.Mesh(
      RIPPLE_GEOMETRY,
      createRippleMaterial()
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;
    mesh.scale.set(0.25 * size, 0.22 * size, 1);
    mesh.position.set(x, y + 0.03, z);
    // 涟漪必须画在海面之后:透明物体按距离排序,顺序会随镜头方向翻转导致涟漪被海面盖住
    mesh.renderOrder = 1;
    this.scene.add(mesh);
    this.ripples.push({ mesh, life: RIPPLE_LIFETIME, size });
  }

  /** 入水/出水时的水花 */
  splash(position: THREE.Vector3): void {
    this.particles.burst(position, '#cfeaf5', 10);
    this.ripple(position.x, position.y, position.z);
  }

  /** 水中移动时持续在身后泛涟漪,游泳与涉水共用,涉水间隔更长;涟漪生成在水面高度 */
  updateSwimming(delta: number, position: THREE.Vector3, interval = 0.4, waterY = position.y): void {
    this.rippleTimer -= delta;
    if (this.rippleTimer <= 0) {
      this.rippleTimer = interval;
      this.ripple(position.x, waterY, position.z);
    }
  }

  update(delta: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life -= delta;
      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
        continue;
      }
      const t = 1 - r.life / RIPPLE_LIFETIME;
      const s = (0.25 + (1 - (1 - t) * (1 - t)) * RIPPLE_MAX_SCALE) * r.size;
      r.mesh.scale.set(s, s * 0.88, 1);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity =
        0.38 * THREE.MathUtils.smoothstep(t, 0, 0.12) * (1 - t) * (1 - t);
    }
  }

  dispose(): void {
    for (const ripple of this.ripples) {
      this.scene.remove(ripple.mesh);
      (ripple.mesh.material as THREE.Material).dispose();
    }
    this.ripples.length = 0;
  }
}
