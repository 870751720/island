import * as THREE from 'three';
import { PhotoCamera } from '../systems/PhotoCamera';
import { StableSunShadow } from './StableSunShadow';

const cameraOffset = new THREE.Vector3();

/** Coordinates the regular follow camera and the local-only photo-mode controls. */
export class GameCameraController {
  private readonly photo = new PhotoCamera();
  private readonly sunShadow = new StableSunShadow();

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.OrthographicCamera,
    private readonly playerPosition: () => THREE.Vector3
  ) {}

  get photoActive(): boolean {
    return this.photo.active;
  }

  enterPhotoMode(): void {
    this.photo.enter(this.playerPosition());
    this.camera.zoom = this.photo.zoom;
    this.camera.updateProjectionMatrix();
  }

  exitPhotoMode(): void {
    this.photo.exit();
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
  }

  pan(dxPx: number, dyPx: number): void {
    if (!this.photo.active) return;
    const height = this.renderer.domElement.clientHeight || 1;
    const worldPerPx = ((this.camera.top - this.camera.bottom) / height) / this.photo.zoom;
    this.photo.pan(dxPx, dyPx, worldPerPx, this.playerPosition());
  }

  zoomBy(factor: number): number {
    if (!this.photo.active) return this.photo.zoom;
    this.photo.zoomBy(factor);
    this.camera.zoom = this.photo.zoom;
    this.camera.updateProjectionMatrix();
    return this.photo.zoom;
  }

  rotate(delta: number): void {
    if (this.photo.active) this.photo.rotate(delta);
  }

  rotatePitch(delta: number): void {
    if (this.photo.active) this.photo.rotatePitch(delta);
  }

  capture(): string | null {
    try {
      return this.renderer.domElement.toDataURL('image/jpeg', 0.85);
    } catch {
      return null;
    }
  }

  renderAndCapture(): string | null {
    this.renderer.render(this.scene, this.camera);
    return this.capture();
  }

  placeImmediately(): void {
    const target = this.playerPosition();
    this.camera.position.copy(target).add(this.photo.offset());
    this.camera.lookAt(target.x, target.y, target.z);
  }

  update(delta: number, sun: THREE.DirectionalLight, sunOffset: THREE.Vector3): void {
    const target = this.photo.active ? this.photo.center : this.playerPosition();
    const offset = this.photo.offset(cameraOffset);
    const desiredX = target.x + offset.x;
    const desiredY = target.y + offset.y;
    const desiredZ = target.z + offset.z;
    if (this.photo.active) {
      this.camera.position.set(desiredX, desiredY, desiredZ);
    } else {
      const smoothing = 1 - Math.pow(0.001, delta);
      this.camera.position.x += (desiredX - this.camera.position.x) * smoothing;
      this.camera.position.y += (desiredY - this.camera.position.y) * smoothing;
      this.camera.position.z += (desiredZ - this.camera.position.z) * smoothing;
    }
    this.camera.lookAt(target.x, target.y, target.z);
    this.sunShadow.update(sun, target, sunOffset);
  }
}
