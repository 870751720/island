import type { BufferGeometry, Matrix4, Object3D } from 'three';

/** 批量绘制模型的只读部件，供单个实体的表现层复用；资源仍归批处理池所有。 */
export type ModelVisualPart = { geometry: BufferGeometry; matrix: Matrix4; worldSpace?: boolean };
export const modelVisualParts = new WeakMap<Object3D, readonly ModelVisualPart[]>();
