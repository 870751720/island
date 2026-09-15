import type { LandmarkKind, LandmarkPart } from './LandmarkDefinitions';
import type { LandmarkBuilder } from './LandmarkBuilder';
import { SETTLEMENT_VARIANTS } from './SettlementVariants';
import { RUIN_VARIANTS } from './RuinVariants';

export type LandmarkVariant = 0 | 1 | 2;
type Position = readonly [number, number, number?];
export type VariantPlan = {
  name: string;
  positions: Partial<Record<LandmarkPart['type'], readonly Position[]>>;
  /** 作物按原模板次序搬到新田块，保留数量与种类。 */
  plots?: readonly (readonly [number, number, number, number])[];
  walls: readonly (readonly [number, number, number, number, number, boolean?])[];
  gates?: readonly Position[];
};

function variantPlan(kind: LandmarkKind, variant: 1 | 2): VariantPlan {
  const plans = SETTLEMENT_VARIANTS[kind] ?? RUIN_VARIANTS[kind];
  if (!plans) throw new Error(`地点缺少方案: ${kind}`);
  return plans[variant - 1];
}

/** 保留基础模板的设施与奖励预算，重新编排独立的空间轮廓。 */
export function applyLandmarkVariant(kind: LandmarkKind, variant: LandmarkVariant, b: LandmarkBuilder) {
  if (variant === 0) return;
  const plan = variantPlan(kind, variant);
  const cropPositions = (plan.plots ?? []).flatMap(([x, z, width, depth]) =>
    Array.from({ length: width * depth }, (_, i) => [x + Math.floor(i / depth), z + i % depth] as const));
  const counts: Partial<Record<LandmarkPart['type'], number>> = {};
  const parts = b.parts.filter(p => p.type !== 'fence' && p.type !== 'gate');
  for (const part of parts) {
    const index = counts[part.type] ?? 0;
    counts[part.type] = index + 1;
    const positions = part.type === 'crop' ? cropPositions : plan.positions[part.type];
    const position: Position | undefined = positions?.[index];
    if (!position) throw new Error(`${kind} 方案 ${variant + 1} 缺少 ${part.type} 坐标`);
    part.x = position[0]; part.z = position[1]; part.rotation = position[2] ?? 0;
  }
  b.parts.splice(0, b.parts.length, ...parts);
  for (const [x,z,dx,dz,count,stone] of plan.walls) b.line(x,z,dx,dz,count,stone);
  for (const [x,z] of plan.gates ?? []) b.add('gate',x,z);
}
