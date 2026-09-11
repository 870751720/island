import * as THREE from 'three';
import { ModelKit, type BoyRig } from './boy/ModelKit';
import { graffitiBoy } from './boy/GraffitiBoy';
import { islandBoy } from './boy/IslandBoy';
import { overallBoy } from './boy/OverallBoy';
import { wildBoy } from './boy/WildBoy';

export const BOY_MODEL_VARIANTS = [
  { id: 'original', label: '原版对照', description: '原有男孩，显示已穿装备' },
  { id: 'graffiti', label: 'A · 涂鸦小子', description: '方圆大头 / 黑锯齿发 / 青绿卫衣 / 红板鞋' },
  { id: 'islander', label: 'B · 海岛少年', description: '清瘦小脸 / 金色长刘海 / 蓝马甲 / 凉鞋' },
  { id: 'overalls', label: 'C · 背带裤男孩', description: '圆墩身材 / 红棕卷发 / 笑眯眼 / 背带裤' },
  { id: 'wild', label: 'D · 野外小猎手', description: '棱角脸 / 放射刺发 / 红头带 / 兽皮赤脚' },
] as const;
export type BoyModelVariant = typeof BOY_MODEL_VARIANTS[number]['id'];
export function isBoyModelVariant(value: unknown): value is BoyModelVariant {
  return BOY_MODEL_VARIANTS.some((variant) => variant.id === value);
}

const builders = { graffiti: graffitiBoy, islander: islandBoy, overalls: overallBoy, wild: wildBoy };
const mouths = {
  original: [0, -0.113, 0.246], graffiti: [0.055, -0.235, 0.287],
  islander: [0.018, -0.175, 0.194], overalls: [0, -0.174, 0.264], wild: [0, -0.19, 0.216],
} as const;

// 隐藏表面仍承载伤口与血滴，匹配各方案身体宽深；不缩放动作关节。
const surfaces = {
  original: { width: 1, depth: 1, arm: 1, leg: 1 },
  graffiti: { width: 1.28, depth: 1.48, arm: 0.83, leg: 0.88 },
  islander: { width: 0.85, depth: 0.9, arm: 0.64, leg: 0.71 },
  overalls: { width: 1.38, depth: 1.5, arm: 1.05, leg: 0.96 },
  wild: { width: 1.02, depth: 1.05, arm: 0.84, leg: 0.81 },
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
