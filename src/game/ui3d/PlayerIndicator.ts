import * as THREE from 'three';

const RING_INNER = 0.32;
const RING_OUTER = 0.48;

/** 玩家头顶的作业进度圆环(世界空间,始终朝向相机);提示文字由 React UI 层渲染 */
export class PlayerIndicator {
  readonly group = new THREE.Group();
  private progressRing: THREE.Mesh;
  private progress = -1;
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera;
    this.group.position.y = 2.1;

    this.group.add(
      new THREE.Mesh(
        new THREE.RingGeometry(RING_INNER, RING_OUTER, 32),
        new THREE.MeshBasicMaterial({
          color: '#000000',
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        })
      )
    );
    this.progressRing = new THREE.Mesh(
      new THREE.RingGeometry(RING_INNER, RING_OUTER, 32, 1, -Math.PI / 2, 0.01),
      new THREE.MeshBasicMaterial({
        color: '#ffd54f',
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      })
    );
    this.group.add(this.progressRing);

    this.setProgress(null);
    scene.add(this.group);
  }

  setProgress(progress: number | null): void {
    if (progress === null) {
      this.group.visible = false;
      this.progress = -1;
      return;
    }
    this.group.visible = true;
    const p = Math.min(Math.max(progress, 0), 1);
    if (Math.abs(p - this.progress) < 0.005) return;
    this.progress = p;
    this.progressRing.geometry.dispose();
    this.progressRing.geometry = new THREE.RingGeometry(
      RING_INNER,
      RING_OUTER,
      32,
      1,
      -Math.PI / 2,
      Math.max(p, 0.01) * Math.PI * 2
    );
    this.group.quaternion.copy(this.camera.quaternion);
  }
}
