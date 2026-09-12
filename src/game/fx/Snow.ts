import * as THREE from 'three';

const FLAKE_COUNT = 620;
const FLAKE_SIZE_PX = 3.2; // 正交相机的点尺寸是屏幕像素,不是世界单位
const AREA = 44; // 覆盖玩家周围的方形区域边长
const TOP = 22;
const FALL_SPEED_MIN = 1.2; // 雪花下落速度范围,慢速飘落
const FALL_SPEED_MAX = 2.6;
const SWAY_SPEED = 0.6; // 水平摆动频率与幅度,模拟飘雪
const SWAY_AMP = 0.8;

/** 柔和圆形雪花贴图:程序生成,避免方块点精灵的生硬边缘 */
function makeFlakeTexture(): THREE.Texture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(240,243,245,0.9)');
  grad.addColorStop(0.7, 'rgba(196,207,216,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 雪花:一组点精灵在玩家周围保持世界位置慢速飘落并左右摆动,透明度随雪量渐变 */
export class Snow {
  readonly points: THREE.Points;
  private positions: Float32Array;
  private fallSpeeds: Float32Array;
  private phases: Float32Array;
  private material: THREE.PointsMaterial;
  private texture: THREE.Texture;
  private readonly previousCenter = new THREE.Vector3();
  private hasCenter = false;

  constructor() {
    this.positions = new Float32Array(FLAKE_COUNT * 3);
    this.fallSpeeds = new Float32Array(FLAKE_COUNT);
    this.phases = new Float32Array(FLAKE_COUNT);
    for (let i = 0; i < FLAKE_COUNT; i++) {
      this.positions.set(
        [(Math.random() - 0.5) * AREA, Math.random() * TOP, (Math.random() - 0.5) * AREA],
        i * 3
      );
      this.fallSpeeds[i] = FALL_SPEED_MIN + Math.random() * (FALL_SPEED_MAX - FALL_SPEED_MIN);
      this.phases[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.texture = makeFlakeTexture();
    this.material = new THREE.PointsMaterial({
      color: '#dce3e8',
      map: this.texture,
      size: FLAKE_SIZE_PX,
      sizeAttenuation: false,
      toneMapped: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.visible = false;
    this.points.frustumCulled = false;
  }

  update(delta: number, elapsed: number, center: THREE.Vector3, intensity: number): void {
    this.points.visible = intensity > 0.01;
    if (!this.points.visible) {
      this.hasCenter = false;
      return;
    }
    this.material.opacity = 0.72 * intensity;
    // 发射范围跟随玩家,抵消中心位移以保持已有雪花的世界位置。
    const shiftX = this.hasCenter ? center.x - this.previousCenter.x : 0;
    const shiftZ = this.hasCenter ? center.z - this.previousCenter.z : 0;
    this.previousCenter.copy(center);
    this.hasCenter = true;
    this.points.position.set(center.x, 0, center.z);
    for (let i = 0; i < FLAKE_COUNT; i++) {
      const j = i * 3;
      let y = this.positions[j + 1] - this.fallSpeeds[i] * delta;
      if (y < 0) y = TOP;
      this.positions[j + 1] = y;
      const x = this.positions[j] - shiftX
        + Math.sin(elapsed * SWAY_SPEED + this.phases[i]) * SWAY_AMP * delta;
      const z = this.positions[j + 2] - shiftZ;
      // 双轴循环补入,取模也能处理传送等超过覆盖范围的位移。
      this.positions[j] = THREE.MathUtils.euclideanModulo(x + AREA / 2, AREA) - AREA / 2;
      this.positions[j + 2] = THREE.MathUtils.euclideanModulo(z + AREA / 2, AREA) - AREA / 2;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
