import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

const LIFETIME = 0.7;
const GEOMETRY = new THREE.IcosahedronGeometry(0.07, 0);

/** 命中/完成时的碎屑粒子特效 */
export class Particles implements Updatable {
  private active: Particle[] = [];
  private materials = new Map<string, THREE.MeshStandardMaterial>();

  constructor(private scene: THREE.Scene) {}

  private material(color: string): THREE.MeshStandardMaterial {
    let mat = this.materials.get(color);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 1,
      });
      this.materials.set(color, mat);
    }
    return mat;
  }

  burst(position: THREE.Vector3, color: string, count = 8): void {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(GEOMETRY, this.material(color));
      mesh.position.copy(position);
      mesh.position.y += 0.5;
      const a = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2;
      const vel = new THREE.Vector3(
        Math.cos(a) * speed * 0.5,
        2 + Math.random() * 2,
        Math.sin(a) * speed * 0.5
      );
      this.scene.add(mesh);
      this.active.push({ mesh, vel, life: LIFETIME });
    }
  }

  update(delta: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.active.splice(i, 1);
        continue;
      }
      p.vel.y -= 9 * delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.rotation.x += delta * 6;
      p.mesh.rotation.y += delta * 4;
    }
  }
}
