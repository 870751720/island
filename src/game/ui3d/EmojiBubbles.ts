import * as THREE from 'three';

const SHOW_SECONDS = 3;
const POP_SECONDS = 0.22;
const FADE_SECONDS = 0.5;
/** 头顶高度:介于名牌 2.65 与自言自语气泡 4.3 之间 */
const HEAD_Y = 3.5;
const SIZE = 1.1;

/** 每个表情一张共享纹理(懒绘制缓存);材质每气泡独立,便于单独淡出后 dispose */
const textures = new Map<string, THREE.Texture>();

function emojiTexture(glyph: string): THREE.Texture {
  const cached = textures.get(glyph);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '96px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textures.set(glyph, texture);
  return texture;
}

interface Bubble {
  sprite: THREE.Sprite;
  target: THREE.Object3D;
  elapsed: number;
}

/** 表情气泡层:玩家头顶冒出表情 Sprite,跟随玩家、弹入、满 3 秒淡出移除;
 * 同一玩家重复发撤旧换新(天然限频);挂在场景层而非玩家组内,不受游泳前倾影响。 */
export class EmojiBubbles {
  private readonly active = new Map<THREE.Object3D, Bubble>();

  constructor(private readonly scene: THREE.Scene) {}

  /** 在 target(玩家根组)头顶显示一个表情 */
  show(target: THREE.Object3D, glyph: string): void {
    const existing = this.active.get(target);
    if (existing) this.retire(existing);
    const material = new THREE.SpriteMaterial({
      map: emojiTexture(glyph),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 999;
    sprite.scale.setScalar(0);
    this.scene.add(sprite);
    this.active.set(target, { sprite, target, elapsed: 0 });
  }

  update(delta: number): void {
    for (const bubble of this.active.values()) {
      bubble.elapsed += delta;
      if (bubble.elapsed >= SHOW_SECONDS) {
        this.retire(bubble);
        continue;
      }
      const p = bubble.target.position;
      bubble.sprite.position.set(p.x, p.y + HEAD_Y, p.z);
      const pop = Math.min(1, bubble.elapsed / POP_SECONDS);
      // back-out 缓动:弹入带轻微过冲
      const backOut = 1 + 2.7 * Math.pow(pop - 1, 3) + 1.7 * Math.pow(pop - 1, 2);
      bubble.sprite.scale.setScalar(SIZE * backOut);
      bubble.sprite.material.opacity = Math.min(1, (SHOW_SECONDS - bubble.elapsed) / FADE_SECONDS);
    }
  }

  private retire(bubble: Bubble): void {
    this.active.delete(bubble.target);
    this.scene.remove(bubble.sprite);
    bubble.sprite.material.dispose();
  }
}
