import type { ResourceKind } from '../systems/Inventory';

/** 树的三种类型:橡树/松树/果树 */
export type TreeSpecies = 'oak' | 'pine' | 'fruit';

/** 树的生长阶段:种子种下即发芽,逐阶段长成成树 */
export type TreeStage = 'sprout' | 'sapling' | 'mature';

export const TREE_SPECIES: TreeSpecies[] = ['oak', 'pine', 'fruit'];

/** 每种树对应的种子道具 */
export const SEED_OF: Record<TreeSpecies, ResourceKind> = {
  oak: 'oakSeed',
  pine: 'pineSeed',
  fruit: 'fruitSeed',
};

/** 每种树对应的可食用果实 */
export const FRUIT_OF: Record<TreeSpecies, ResourceKind> = {
  oak: 'oakFruit',
  pine: 'pineFruit',
  fruit: 'fruitFruit',
};

/** 砍倒成树第一阶段后额外掉落种子/果实的概率 */
export const SEED_DROP_CHANCE = 1 / 3;
export const FRUIT_DROP_CHANCE = 1 / 10;

/** 每 60 秒一次生长判定,每次有 1/2 概率长到下一阶段 */
export const GROWTH_INTERVAL = 60;
export const GROWTH_CHANCE = 0.5;
