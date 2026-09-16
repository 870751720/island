import * as THREE from 'three';

/** 屏幕外脱困选点；房主调用，沿途采样避免落进另一处围挡。 */
export class DogRecovery {
  private cooldown = 0;
  private retry = 0;
  private projected = new THREE.Vector3();
  private candidate = new THREE.Vector3();

  update(delta: number, position: THREE.Vector3, anchor: THREE.Vector3,
    camera: THREE.OrthographicCamera | null, height: (x: number, z: number) => number,
    blocked: (x: number, z: number) => boolean): THREE.Vector3 | null {
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.retry = Math.max(0, this.retry - delta);
    if (!camera || this.cooldown > 0 || this.retry > 0) return null;
    this.retry = 0.5;
    camera.updateMatrixWorld(true);
    this.projected.copy(position).project(camera);
    if (Math.max(Math.abs(this.projected.x), Math.abs(this.projected.y)) <= 1.35
      || position.distanceToSquared(anchor) < 36) return null;
    const start = Math.atan2(position.z - anchor.z, position.x - anchor.x);
    for (let i = 0; i < 24; i++) {
      const angle = start + i * Math.PI * 2 / 24;
      for (let distance = 0.4; distance <= 100; distance += 0.2) {
        const x = anchor.x + Math.cos(angle) * distance;
        const z = anchor.z + Math.sin(angle) * distance;
        if (blocked(x, z)) break;
        this.candidate.set(x, height(x, z), z);
        this.projected.copy(this.candidate).project(camera);
        const edge = Math.max(Math.abs(this.projected.x), Math.abs(this.projected.y));
        if (edge < 1.12) continue;
        if (edge <= 1.22 && position.distanceToSquared(this.candidate) > 4) {
          this.cooldown = 10;
          return this.candidate;
        }
        break;
      }
    }
    return null;
  }
}
