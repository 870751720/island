import * as THREE from 'three';

interface Ripple {
  mesh: THREE.Mesh;
  life: number;
}

const RIPPLE_LIFETIME = 1.2;
const RIPPLE_MAX_SCALE = 1.6;
const RIPPLE_GEOMETRY = new THREE.RingGeometry(0.86, 1, 20);

/** 水面交互特效:入水水花与游泳时扩散的涟漪圈 */
export class WaterFx {
  private ripples: Ripple[] = [];
  private rippleTimer = 0;

  constructor(
    private scene: THREE.Scene,
    private particles: { burst: (position: THREE.Vector3, color: string, count?: number) => void }
  ) {}

  /** 在水面位置泛一圈涟漪 */
  ripple(x: number, y: number, z: number): void {
    const mesh = new THREE.Mesh(
      RIPPLE_GEOMETRY,
      new THREE.MeshBasicMaterial({
        color: '#eaf7ff',
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y + 0.03, z);
    this.scene.add(mesh);
    this.ripples.push({ mesh, life: RIPPLE_LIFETIME });
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
      const s = 0.25 + t * RIPPLE_MAX_SCALE;
      r.mesh.scale.setScalar(s);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t);
    }
  }
}
