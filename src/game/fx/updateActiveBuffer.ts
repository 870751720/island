import type { BufferAttribute, InterleavedBufferAttribute } from 'three';

/** 只上传本帧参与绘制的前缀；容量与粒子数量、动画计算保持不变。 */
export function updateActiveBuffer(attribute: BufferAttribute | InterleavedBufferAttribute, components: number): void {
  const buffer = 'isInterleavedBufferAttribute' in attribute ? attribute.data : attribute;
  buffer.clearUpdateRanges();
  buffer.addUpdateRange(0, components);
  buffer.needsUpdate = true;
}
