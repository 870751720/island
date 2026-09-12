import * as THREE from 'three';

const SHOW_SECONDS = 3;
const POP_SECONDS = 0.22;
const FADE_SECONDS = 0.5;
/** 气泡底边贴联机名牌顶边:名牌中心 2.65 + 半高 0.35 + 气泡半高 0.44 */
const HEAD_Y = 3.44;
/** 气泡整体高度:首版裸表情(1.1)的 0.8 倍 */
const SIZE = 0.88;
/** 画布宽高比(药丸底横向留边),Sprite 宽按此比例放大 */
const ASPECT = 1.25;

/** 每个表情一张共享纹理(懒绘制缓存);材质每气泡独立,便于单独淡出后 dispose */
const textures = new Map<string, THREE.Texture>();

function emojiTexture(glyph: string): THREE.Texture {
  const cached = textures.get(glyph);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  // 白色药丸底 + 轻投影,仿小狗表情气泡
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.beginPath();
  ctx.roundRect(6, 8, 148, 112, 56);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.font = '76px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // 各平台 emoji 字体度量不一,按字形实际墨迹包围盒精确居中到药丸中心 (80, 64)
  const m = ctx.measureText(glyph);
  const inkX = 80 - ((m.actualBoundingBoxRight ?? 0) - (m.actualBoundingBoxLeft ?? 0)) / 2;
  const inkY = 64 + ((m.actualBoundingBoxAscent ?? 0) - (m.actualBoundingBoxDescent ?? 0)) / 2;
  ctx.fillText(glyph, inkX, inkY);
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

/** 表情气泡层:玩家头顶冒出白色药丸表情 Sprite,跟随玩家、弹入、满 3 秒淡出移除;
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
    sprite.scale.set(0, 0, 1);
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
      bubble.sprite.scale.set(SIZE * ASPECT * backOut, SIZE * backOut, 1);
      bubble.sprite.material.opacity = Math.min(1, (SHOW_SECONDS - bubble.elapsed) / FADE_SECONDS);
    }
  }

  private retire(bubble: Bubble): void {
    this.active.delete(bubble.target);
    this.scene.remove(bubble.sprite);
    bubble.sprite.material.dispose();
  }
}
