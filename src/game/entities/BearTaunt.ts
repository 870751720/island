/** 单机放生演出：只描述时间轴，不持有渲染或联机状态。 */
export const BEAR_TAUNT_SECONDS = 5;
export const BEAR_TAUNT_COOLDOWN = 60;
export const BEAR_TAUNT_SCRIPTS = [
  [['look', 'question'], ['point', 'laugh'], ['rofl', 'point', 'rofl'], ['wave', 'smirk']],
  [['look', 'question'], ['point', 'bored'], ['bored', 'bored'], ['wave', 'bored']],
  [['look', 'look'], ['laugh', 'laugh'], ['rofl', 'laugh', 'rofl'], ['laugh', 'wave']],
  [['look', 'smirk'], ['clap', 'clap', 'clap'], ['point', 'laugh', 'clap'], ['bored', 'wave']],
  [['question', 'look'], ['facepalm', 'facepalm'], ['point', 'bored'], ['wave', 'bored']],
  [['look', 'point'], ['smirk', 'smirk'], ['facepalm', 'bored'], ['wave', 'smirk']],
] as const;
export type TauntGlyph = typeof BEAR_TAUNT_SCRIPTS[number][number][number];
export const TAUNT_SPECTATOR_GLYPHS: readonly TauntGlyph[][] = [
  ['look', 'laugh'], ['point', 'rofl'], ['facepalm', 'laugh'],
];

export function canBearSpare(solo: boolean, health: number, maxHealth: number, cooldown: number): boolean {
  return solo && health > maxHealth * 0.8 && cooldown <= 0;
}

/** 仅在已经确认致命、符合条件时调用；恰好 0.6 不触发。 */
export function rollBearMercy(random = Math.random): boolean { return random() < 0.6; }

export function chooseTaunt(previous: number, random = Math.random): number {
  const count = BEAR_TAUNT_SCRIPTS.length;
  if (previous < 0) return Math.floor(random() * count);
  return (previous + 1 + Math.floor(random() * (count - 1))) % count;
}

export function tauntRound(elapsed: number): number {
  return elapsed < 1.15 ? 0 : elapsed < 2.4 ? 1 : elapsed < 3.7 ? 2 : 3;
}
