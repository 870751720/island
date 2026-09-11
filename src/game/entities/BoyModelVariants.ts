import * as THREE from 'three';

export const BOY_MODEL_VARIANTS = [
  { id: 'original', label: '原版对照', description: '原有圆球拼接轮廓' },
  { id: 'soft', label: 'A · 圆润童趣', description: '饱满脸颊、短下巴、宽松短袖' },
  { id: 'natural', label: 'B · 自然少年', description: '收窄脸型、修长四肢、利落侧分' },
  { id: 'adventure', label: 'C · 蓬松冒险家', description: '蓬松偏分、方圆脸、厚实衣裤' },
] as const;
export type BoyModelVariant = typeof BOY_MODEL_VARIANTS[number]['id'];
export function isBoyModelVariant(value: unknown): value is BoyModelVariant {
  return BOY_MODEL_VARIANTS.some((variant) => variant.id === value);
}

export type BoyPart = 'head' | 'hair' | 'torso' | 'waist' | 'sleeve' | 'arm' | 'forearm' | 'hand' | 'shorts' | 'calf';
const shapes = {
  soft: { faceWidth: 1.04, chin: 0.13, body: 1.04, limb: 1.04, hair: 1.02 },
  natural: { faceWidth: 0.92, chin: 0.22, body: 0.94, limb: 0.91, hair: 0.96 },
  adventure: { faceWidth: 1, chin: 0.07, body: 1.09, limb: 1.02, hair: 1.09 },
};

/** 只改基础网格顶点，关节、装备和伤口挂点不缩放；缓存 CPU 顶点以精确恢复原版。 */
export class BoyModelVariants {
  private parts: { mesh: THREE.Mesh; role: BoyPart; original: Float32Array; height: number }[] = [];
  private current: BoyModelVariant = 'original';

  register(mesh: THREE.Mesh, role: BoyPart): void {
    const positions = mesh.geometry.getAttribute('position');
    const original = new Float32Array(positions.array);
    let height = 0;
    for (let i = 1; i < original.length; i += 3) height = Math.max(height, Math.abs(original[i]));
    this.parts.push({ mesh, role, original, height });
  }

  apply(variant: BoyModelVariant): void {
    if (variant === this.current) return;
    this.current = variant;
    for (const { mesh, role, original, height } of this.parts) {
      const positions = mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        let x = original[i * 3], y = original[i * 3 + 1], z = original[i * 3 + 2];
        if (variant !== 'original') {
          const shape = shapes[variant];
          if (role === 'head' || role === 'hair') {
            // 同一映射用于脸和合批五官，避免眼鼻浮空；下颌自然收束。
            const lower = THREE.MathUtils.clamp(-y / 0.3, 0, 1);
            x *= shape.faceWidth * (1 - shape.chin * lower);
            if (role === 'head') {
              z *= 1 - lower * 0.08;
              y *= variant === 'soft' ? 0.96 : 1;
            } else {
              x *= shape.hair;
              y = 0.08 + (y - 0.08) * shape.hair;
              if (z > 0.1 && y > 0.08) {
                y += (variant === 'adventure' ? 0.045 : 0.018) * Math.sin(x * 13 + 0.7);
              }
            }
          } else {
            const t = Math.min(1, Math.abs(y) / height);
            // 扩展椭球两端截面，形成圆角衣筒/肢体，消除串珠式细接缝。
            const clothing = role === 'torso' || role === 'waist' || role === 'sleeve' || role === 'shorts';
            const fullness = Math.pow(Math.max(0.035, 1 - t * t), clothing ? -0.32 : -0.18);
            const width = clothing ? shape.body : shape.limb;
            x *= fullness * width;
            z *= fullness * (clothing ? 1 : 0.96);
            if (role === 'hand') { x *= 0.88; z *= 0.8; }
            if (role === 'forearm' || role === 'calf') {
              const taper = 1 + (y / height) * 0.08;
              x *= taper; z *= taper;
            }
          }
        }
        positions.setXYZ(i, x, y, z);
      }
      positions.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
    }
  }
}
