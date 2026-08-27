import * as THREE from 'three';

const RING_INNER = 0.32;
const RING_OUTER = 0.48;

function makeRing(color: string, opacity: number, thetaLength = Math.PI * 2): THREE.Mesh {
  const geo =
    thetaLength >= Math.PI * 2
      ? new THREE.RingGeometry(RING_INNER, RING_OUTER, 32)
      : new THREE.RingGeometry(RING_INNER, RING_OUTER, 32, 1, -Math.PI / 2, thetaLength);
  return new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide })
  );
}

/** 玩家头顶的世界空间指示器:文字标签 + 作业进度圆环,始终朝向相机 */
export class PlayerIndicator {
  readonly group = new THREE.Group();
  private labelSprite: THREE.Sprite;
  private labelText = '';
  private progressRing: THREE.Mesh;
  private progress = -1;
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera;
    this.group.position.y = 2.1;

    this.group.add(makeRing('#000000', 0.35));
    this.progressRing = makeRing('#ffd54f', 0.95, 0.01);
    this.group.add(this.progressRing);

    this.labelSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ transparent: true, depthTest: false })
    );
    this.labelSprite.scale.set(1.6, 0.4, 1);
    this.labelSprite.position.y = 0.75;
    this.group.add(this.labelSprite);

    this.setLabel(null);
    this.setProgress(null);
    scene.add(this.group);
  }

  /** 更新头顶内容;label 为 null 时整体隐藏 */
  set(label: string | null, progress: number | null): void {
    this.group.visible = !!label;
    if (label !== this.labelText) this.setLabel(label);
    this.setProgress(progress);
    this.faceCamera();
  }

  private setLabel(text: string | null): void {
    this.labelText = text ?? '';
    if (!this.labelText) return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const r = 18;
    ctx.beginPath();
    ctx.roundRect(28, 8, 200, 48, r);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.labelText, 128, 33);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = this.labelSprite.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.map = texture;
    mat.needsUpdate = true;
  }

  private setProgress(progress: number | null): void {
    const p = Math.max(progress ?? 0, 0);
    if (Math.abs(p - this.progress) < 0.01) return;
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
  }

  private faceCamera(): void {
    this.group.quaternion.copy(this.camera.quaternion);
  }
}
