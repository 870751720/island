import * as THREE from 'three';

/** 低成本玩家名牌：每名玩家一个 CanvasTexture 精灵，始终朝向相机。 */
export class PlayerNameTag {
  private readonly canvas = document.createElement('canvas');
  private readonly texture: THREE.CanvasTexture;
  readonly sprite: THREE.Sprite;
  private current = '';

  constructor(parent: THREE.Object3D, name: string) {
    this.canvas.width = 256;
    this.canvas.height = 64;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: this.texture, transparent: true, depthTest: false });
    this.sprite = new THREE.Sprite(material);
    this.sprite.position.set(0, 2.65, 0);
    this.sprite.scale.set(2.8, 0.7, 1);
    this.sprite.renderOrder = 20;
    parent.add(this.sprite);
    this.setName(name);
  }

  setName(name: string): void {
    const next = name.trim().slice(0, 8) || '岛友';
    if (next === this.current) return;
    this.current = next;
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = 'rgba(24, 35, 28, 0.72)';
    ctx.beginPath();
    ctx.roundRect(8, 6, 240, 52, 24);
    ctx.fill();
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fffdf2';
    ctx.fillText(next, 128, 33, 218);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.sprite.removeFromParent();
    this.texture.dispose();
    (this.sprite.material as THREE.Material).dispose();
  }
}
