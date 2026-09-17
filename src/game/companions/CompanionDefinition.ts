import type { ResourceKind } from '../systems/Inventory';

export type CompanionKind = 'dog' | 'cat';
export const companionKind = (value: unknown): CompanionKind => value === 'cat' ? 'cat' : 'dog';
export const COMPANIONS = {
  dog: { name: '薯条', description: '热情的黑色博美，扑咬护主。' },
  cat: { name: '可乐', description: '好奇的灰白猫咪，发掘食物。' },
} as const;

export const CAT_STAGES = [
  { stage: 1, name: '好奇宝宝', xp: 0, cooldown: 180, skill: '发掘浆果' },
  { stage: 2, name: '寻味伙伴', xp: 120, cooldown: 165, skill: '还能找到苹果、胡萝卜' },
  { stage: 3, name: '扒拉能手', xp: 360, cooldown: 150, skill: '还能找到土豆、红薯' },
  { stage: 4, name: '觅食专家', xp: 800, cooldown: 135, skill: '还能找到鸟肉' },
  { stage: 5, name: '荒岛寻宝家', xp: 1500, cooldown: 120, skill: '还能找到兽肉' },
] as const;

export const CAT_FINDS: readonly { kind: ResourceKind; stage: number; weight: number }[] = [
  { kind: 'berry', stage: 1, weight: 36 },
  { kind: 'fruitFruit', stage: 2, weight: 18 },
  { kind: 'carrot', stage: 2, weight: 18 },
  { kind: 'potato', stage: 3, weight: 12 },
  { kind: 'sweetPotato', stage: 3, weight: 12 },
  { kind: 'birdMeat', stage: 4, weight: 9 },
  { kind: 'gameMeat', stage: 5, weight: 7 },
];

export function rollCatFood(stage: number, random = Math.random): ResourceKind {
  const pool = CAT_FINDS.filter(item => item.stage <= stage);
  let roll = random() * pool.reduce((sum, item) => sum + item.weight, 0);
  for (const item of pool) { roll -= item.weight; if (roll < 0) return item.kind; }
  return pool[0]?.kind ?? 'berry';
}
