import * as THREE from 'three';

type DamageNumber = {
  sprite: THREE.Sprite;
  anchor?: THREE.Object3D;
  offset: THREE.Vector3;
  age: number;
};

/** 世界空间伤害数字，跟随动物平移，不继承模型转向或死亡侧翻。 */
export class AnimalDamageNumbers {
  private active: DamageNumber[] = [];
  private position = new THREE.Vector3();

  constructor(private scene: THREE.Scene) {}

  show(amount: number, anchor: THREE.Object3D | undefined, fallback: THREE.Vector3): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (this.active.length >= 32) this.remove(this.active.shift()!);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = '600 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(35, 35, 35, 0.85)';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#b8b8b8';
    const text = `-${Math.max(1, Math.round(amount))}`;
    ctx.strokeText(text, 128, 32, 248);
    ctx.fillText(text, 128, 32, 248);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, transparent: true, depthWrite: false,
    }));
    sprite.scale.set(1.28, 0.32, 1);
    const offset = new THREE.Vector3(0, 0.5, 0);
    sprite.position.copy(fallback).add(offset);
    if (anchor) {
      const box = new THREE.Box3().setFromObject(anchor);
      anchor.getWorldPosition(this.position);
      if (!box.isEmpty()) {
        box.getCenter(offset);
        offset.y = box.max.y + 0.18;
        offset.sub(this.position);
      }
      sprite.position.copy(this.position).add(offset);
    }
    this.scene.add(sprite);
    this.active.push({ sprite, anchor, offset, age: 0 });
  }

  update(delta: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const pop = this.active[i];
      pop.age += delta;
      if (pop.age >= 1) {
        this.remove(pop);
        this.active.splice(i, 1);
        continue;
      }
      if (pop.anchor?.parent) {
        pop.anchor.getWorldPosition(pop.sprite.position);
        pop.sprite.position.add(pop.offset);
        pop.sprite.position.y += 0.55 * pop.age;
        pop.sprite.visible = pop.anchor.visible;
      } else {
        pop.sprite.position.y += 0.55 * delta;
      }
      pop.sprite.material.opacity = 1 - pop.age;
    }
  }

  private remove(pop: DamageNumber): void {
    pop.sprite.removeFromParent();
    pop.sprite.material.map?.dispose();
    pop.sprite.material.dispose();
  }

  dispose(): void {
    this.active.forEach((pop) => this.remove(pop));
    this.active = [];
  }
}
