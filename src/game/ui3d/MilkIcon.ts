import { roundedRectPath } from '@/platform/compat';
import * as THREE from 'three';

/** 羊奶图标纹理(绵羊头顶冒出的奶瓶,透明无背景;全部实例共享一张) */
let sharedTexture: THREE.Texture | null = null;

/** 建一个奶瓶图标 Sprite:挂在羊头顶,有奶时可见 */
export function makeMilkIcon(): THREE.Sprite {
  if (!sharedTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d0b18c';
    roundedRectPath(ctx, 45, 14, 38, 17, 6); ctx.fill();
    ctx.fillStyle = '#b1d2c7';
    roundedRectPath(ctx, 35, 29, 58, 82, 14); ctx.fill();
    ctx.fillStyle = '#fff0d5';
    roundedRectPath(ctx, 41, 51, 46, 53, 10); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(47, 37); ctx.lineTo(47, 47); ctx.stroke();
    sharedTexture = new THREE.CanvasTexture(canvas);
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: sharedTexture, transparent: true, depthWrite: false })
  );
  sprite.scale.setScalar(0.6);
  sprite.position.y = 1.25;
  sprite.visible = false;
  return sprite;
}
