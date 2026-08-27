import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { IslandTerrain } from '../world/IslandTerrain';

const MOVE_SPEED = 5;

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
  });
}

/** 程序拼装的低多边形小人 + 运行时走路动画 */
export class Player implements Updatable {
  readonly group = new THREE.Group();
  private terrain: IslandTerrain;
  private limbs: { mesh: THREE.Mesh; phase: number }[] = [];
  private keys = new Set<string>();
  private moving = false;

  constructor(terrain: IslandTerrain) {
    this.terrain = terrain;

    const skin = clayMaterial('#e8b88a');
    const shirt = clayMaterial('#4a7fb5');
    const pants = clayMaterial('#5b4632');

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.28), shirt);
    torso.position.y = 0.85;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.32), skin);
    head.position.y = 1.32;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), clayMaterial('#4a3220'));
    hair.position.y = 1.5;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.5, 0.13), skin);
    armL.position.set(-0.31, 0.85, 0);
    const armR = armL.clone();
    armR.position.x = 0.31;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), pants);
    legL.position.set(-0.12, 0.3, 0);
    const legR = legL.clone();
    legR.position.x = 0.12;

    for (const m of [torso, head, armL, armR, legL, legR]) {
      m.castShadow = true;
      this.group.add(m);
    }
    this.limbs = [
      { mesh: armL, phase: 0 },
      { mesh: armR, phase: Math.PI },
      { mesh: legL, phase: Math.PI },
      { mesh: legR, phase: 0 },
    ];

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    this.group.position.set(0, terrain.getHeight(0, 0), 0);
  }

  private onKeyDown = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase());
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

  update(delta: number, elapsed: number): void {
    let dx = 0;
    let dz = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dz -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dz += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    this.moving = dx !== 0 || dz !== 0;
    if (this.moving) {
      const len = Math.hypot(dx, dz);
      const p = this.group.position;
      p.x += (dx / len) * MOVE_SPEED * delta;
      p.z += (dz / len) * MOVE_SPEED * delta;
      const half = this.terrain.size / 2 - 1;
      p.x = THREE.MathUtils.clamp(p.x, -half, half);
      p.z = THREE.MathUtils.clamp(p.z, -half, half);
      p.y = this.terrain.getHeight(p.x, p.z);
      this.group.rotation.y = Math.atan2(dx, dz);
    }

    // 运行时走路动画:四肢绕根关节摆动
    const swing = this.moving ? 0.7 : 0;
    for (const limb of this.limbs) {
      limb.mesh.rotation.x = Math.sin(elapsed * 10 + limb.phase) * swing;
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
