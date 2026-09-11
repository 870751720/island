import * as THREE from 'three';
import { ModelKit, type BoyRig } from './boy/ModelKit';
import { naturalBoy } from './boy/NaturalBoy';

export const BOY_MODEL_VARIANTS = [
  { id: 'original', label: '原版 · 新动作', description: '肩肘膝踝联动 / 收窄下颌 / 显示已穿装备' },
  { id: 'child', label: 'A · 十岁男孩', description: '自然圆脸 / 黑色短发 / 蓝灰短袖 / 短裤球鞋' },
  { id: 'teen', label: 'B · 十三四岁少年', description: '小头清瘦 / 黑色偏分短发 / 浅色短袖 / 深色短裤' },
] as const;
export type BoyModelVariant = typeof BOY_MODEL_VARIANTS[number]['id'];
export function isBoyModelVariant(value: unknown): value is BoyModelVariant {
  return BOY_MODEL_VARIANTS.some((variant) => variant.id === value);
}

const builders = {
  child: (kit: ModelKit, rig: BoyRig) => naturalBoy(kit, rig, false),
  teen: (kit: ModelKit, rig: BoyRig) => naturalBoy(kit, rig, true),
};
const mouths = {
  original: [0, -0.113, 0.246], child: [0, -0.127, 0.09856], teen: [0, -0.107, 0.09064],
} as const;

// 隐藏表面仍承载伤口与血滴，不缩放动作关节。
const surfaces = {
  original: { width: 1, depth: 1, arm: 1, leg: 1 },
  child: { width: 0.87, depth: 0.81, arm: 0.62, leg: 0.79 },
  teen: { width: 0.83, depth: 0.79, arm: 0.62, leg: 0.79 },
};

/** 保留原关节与挂点，按需挂载独立造型；切换即释放上一套 GPU 资源。 */
export class BoyModelVariants {
  private baseMaterials = new Set<THREE.Material>();
  private current: BoyModelVariant = 'original';
  private preview: ReturnType<ModelKit['finish']> | null = null;
  readonly mouth = new THREE.Vector3(...mouths.original);

  constructor(private rig: BoyRig) {
    // 在工具、伤口和装备挂入之前捕获基础材质，隐藏表面时不隐藏任何关节子树。
    rig.root.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) this.baseMaterials.add(material);
      }
    });
  }

  get active(): boolean { return this.current !== 'original'; }

  apply(variant: BoyModelVariant): void {
    if (variant === this.current) return;
    this.clearPreview();
    if (variant !== 'original') {
      const kit = new ModelKit();
      builders[variant](kit, this.rig);
      this.preview = kit.finish();
    }
    for (const material of this.baseMaterials) material.visible = variant === 'original';
    this.current = variant;
    const [x, y, z] = mouths[variant];
    this.mouth.set(x, y, z);
    this.fitSurfaces(variant);
  }

  private fitSurfaces(variant: BoyModelVariant): void {
    const shape = surfaces[variant];
    this.rig.torso.scale.set(shape.width, 1, shape.depth);
    for (const mesh of this.rig.armSurfaces) mesh.scale.set(shape.arm, 1, shape.arm);
    for (const mesh of this.rig.legSurfaces) mesh.scale.set(shape.leg, 1, shape.leg);
  }

  private clearPreview(): void {
    if (!this.preview) return;
    for (const mesh of this.preview.meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); }
    this.preview.material.dispose();
    this.preview = null;
  }

  dispose(): void {
    this.clearPreview();
    for (const material of this.baseMaterials) material.visible = true;
    this.current = 'original';
    this.mouth.set(...mouths.original);
    this.fitSurfaces('original');
  }
}
