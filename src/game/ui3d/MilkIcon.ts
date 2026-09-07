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
    ctx.font = '96px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🥛', 64, 70);
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
