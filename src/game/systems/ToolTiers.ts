/**
 * 各级工具(1 基础 / 2 石制 / 3 铁制)对资源点与可挖掘放置物的
 * 命中次数与解锁规则,采集与各放置物系统共用同一份表。
 */

function clampTier(tier: number): number {
  return Math.min(Math.max(tier, 1), 3);
}

/** 斧头砍伐命中次数(下标 = 等级 - 1) */
const AXE_HITS: Record<'tree' | 'stump', number[]> = {
  tree: [3, 2, 1],
  stump: [2, 2, 1],
};

/** 镐类资源的解锁等级与各级命中次数(下标 = 等级 - 1) */
const PICKAXE_RULES: Record<'rock' | 'iron' | 'meteor', { unlock: number; hits: number[] }> = {
  rock: { unlock: 1, hits: [5, 4, 2] },
  iron: { unlock: 2, hits: [5, 5, 3] },
  meteor: { unlock: 3, hits: [5, 5, 5] },
};

export function axeHits(kind: 'tree' | 'stump', tier: number): number {
  return AXE_HITS[kind][clampTier(tier) - 1];
}

export function pickaxeUnlocked(kind: 'rock' | 'iron' | 'meteor', tier: number): boolean {
  return tier >= PICKAXE_RULES[kind].unlock;
}

export function pickaxeHits(kind: 'rock' | 'iron' | 'meteor', tier: number): number {
  return PICKAXE_RULES[kind].hits[clampTier(tier) - 1];
}

/** 铲子挖掘命中次数(丛与一切可挖走的放置物同表) */
export function shovelHits(tier: number): number {
  return [3, 2, 1][clampTier(tier) - 1];
}

/** 锄头开出土壤的站定放置时长(秒,等级越高锄得越快) */
export function hoePlaceTime(tier: number): number {
  return [2, 1.5, 1][clampTier(tier) - 1];
}
