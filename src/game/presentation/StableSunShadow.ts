import * as THREE from 'three';

/** Keep the moving shadow camera aligned to its light-space texel grid. */
export class StableSunShadow {
  private readonly backward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly center = new THREE.Vector3();

  update(sun: THREE.DirectionalLight, target: THREE.Vector3, offset: THREE.Vector3): void {
    const camera = sun.shadow.camera;
    this.backward.copy(offset).normalize();
    this.right.crossVectors(camera.up, this.backward).normalize();
    this.up.crossVectors(this.backward, this.right);

    const texelX = (camera.right - camera.left) / sun.shadow.mapSize.x;
    const texelY = (camera.top - camera.bottom) / sun.shadow.mapSize.y;
    const x = target.dot(this.right);
    const y = target.dot(this.up);
    this.center.copy(target)
      .addScaledVector(this.right, Math.round(x / texelX) * texelX - x)
      .addScaledVector(this.up, Math.round(y / texelY) * texelY - y);

    // Translate light and target together so snapping never changes sun direction.
    sun.position.copy(this.center).add(offset);
    sun.target.position.copy(this.center);
    sun.target.updateMatrixWorld();
  }
}
