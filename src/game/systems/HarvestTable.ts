import type { ActionType } from '../entities/Player';
import type { Prop } from '../world/Props';
import {
  FRUIT_DROP_CHANCE,
  FRUIT_OF,
  SEED_DROP_CHANCE,
  SEED_OF,
  TREE_SPECIES,
  fruitPickCount,
} from '../world/TreeSpecies';
import type { ResourceKind } from './Inventory';

/** 采获产出的数量:固定值、闭区间随机,或自定义掷点(如摘果的加权档位) */
export type HarvestCount = number | readonly [number, number] | (() => number);

/** 单条产出声明:固定道具 / 随机取其一 / 按树种的种子或果实;chance 省略或为 1 即必得 */
export type HarvestDrop =
  | { kind: ResourceKind; count?: HarvestCount; chance?: number }
  | { oneOf: readonly ResourceKind[]; chance?: number }
  | { bySpecies: 'seed' | 'fruit'; chance?: number };

/** 作业对象种类:树桩是成树的第二段,空手摘果的果树单独配置;未成树(发芽/小树)不可砍 */
export type HarvestKind = Prop['kind'] | 'stump' | 'fruitTree';

/** 采集石类资源点时额外蹦出燧石的概率 */
const FLINT_CHANCE = 0.25;
/** 采草丛/灌木时掉落作物种子的概率(两种种子随机其一) */
const GRASS_SEED_CHANCE = 0.2;
const SHRUB_SEED_CHANCE = 0.15;
const CROP_SEEDS = ['carrotSeed', 'wheatSeed'] as const;

/** 各资源点:作业动画、命中次数、命中特效色、图鉴展示名与产出声明(结算与图鉴共用同一张表) */
export const HARVEST_CONFIG: Record<
  HarvestKind,
  {
    action: ActionType;
    hits: number;
    fxColor: string;
    label: string;
    drops: readonly HarvestDrop[];
  }
> = {
  fruitTree: {
    // 空手摘果:一次大概率 1 个、小概率 2 个、极小概率 3 个,树保留并进入挂果再生
    action: 'pick',
    hits: 1,
    fxColor: '#c0392b',
    label: '空手摘果',
    drops: [
      { kind: FRUIT_OF.fruit, count: fruitPickCount },
      // 摘果时果树上偶尔缠着番茄藤,顺手捎回种子
      { kind: 'tomatoSeed', chance: 0.01 },
    ],
  },
  tree: {
    action: 'chop',
    hits: 3,
    fxColor: '#4f9440',
    label: '砍树',
    drops: [
      { kind: 'branch', count: 2 },
      { kind: 'wood', count: 1 },
      // 第一阶段砍倒树冠时,按树种掉落种子与可食用果实
      { bySpecies: 'seed', chance: SEED_DROP_CHANCE },
      { bySpecies: 'fruit', chance: FRUIT_DROP_CHANCE },
      // 林下偶有野生大豆,砍树时小概率捎回豆种
      { kind: 'soybeanSeed', chance: 0.01 },
    ],
  },
  stump: {
    action: 'chop',
    hits: 2,
    fxColor: '#8a6239',
    label: '树桩',
    drops: [{ kind: 'branch', count: 1 }, { kind: 'wood', count: 2 }],
  },
  rock: {
    action: 'mine',
    hits: 5,
    fxColor: '#9a9a9a',
    label: '挖石头',
    drops: [{ kind: 'stone', count: 2 }, { kind: 'flint', chance: FLINT_CHANCE }],
  },
  iron: {
    action: 'mine',
    hits: 5,
    fxColor: '#b0714f',
    label: '铁矿',
    drops: [
      { kind: 'stone', count: 2 },
      { kind: 'flint', chance: FLINT_CHANCE },
      { kind: 'ironOre', count: [2, 4] },
    ],
  },
  meteor: {
    action: 'mine',
    hits: 5,
    fxColor: '#e8703a',
    label: '陨石',
    drops: [
      { kind: 'stone', count: 2 },
      { kind: 'flint', chance: FLINT_CHANCE },
      { kind: 'ironOre', count: [2, 4] },
    ],
  },
  gravel: {
    action: 'pick',
    hits: 1,
    fxColor: '#b5b0a8',
    label: '碎石堆',
    drops: [{ kind: 'stone', count: 2 }, { kind: 'flint', chance: FLINT_CHANCE }],
  },
  berry: {
    action: 'pick',
    hits: 1,
    fxColor: '#c0392b',
    label: '浆果丛',
    drops: [{ kind: 'berry', count: 1 }],
  },
  shrub: {
    action: 'pick',
    hits: 2,
    fxColor: '#6b8f4e',
    label: '灌木丛',
    drops: [{ kind: 'branch', count: 1 }, { oneOf: CROP_SEEDS, chance: SHRUB_SEED_CHANCE }],
  },
  grass: {
    action: 'pick',
    hits: 1,
    fxColor: '#a4c46a',
    label: '草丛',
    drops: [{ kind: 'fiber', count: 1 }, { oneOf: CROP_SEEDS, chance: GRASS_SEED_CHANCE }],
  },
  wormNest: {
    // 捉蚯蚓:空手从窝里捉走蚯蚓,每次 1-3 只
    action: 'pick',
    hits: 1,
    fxColor: '#d98a8a',
    label: '蚯蚓窝',
    drops: [
      { kind: 'worm', count: [1, 3] },
      // 翻湿土偶尔带出一颗漏收的土豆
      { kind: 'potatoSeed', chance: 0.02 },
    ],
  },
};

/** 铲子挖走的丛/窝对应的道具 */
export const DIG_YIELD: Partial<
  Record<'berry' | 'shrub' | 'grass' | 'wormNest', 'berryBush' | 'shrubBush' | 'grassTuft' | 'wormNest'>
> = {
  berry: 'berryBush',
  shrub: 'shrubBush',
  grass: 'grassTuft',
  wormNest: 'wormNest',
};

/** 掷点产出数量:固定值直接返回,区间均匀随机,函数档位交由其自掷 */
export function rollHarvestCount(count: HarvestCount | undefined): number {
  if (count === undefined) return 1;
  if (typeof count === 'number') return count;
  if (typeof count === 'function') return count();
  return count[0] + Math.floor(Math.random() * (count[1] - count[0] + 1));
}

/** 展开一条产出声明为可能获得的具体道具(图鉴推导用,不含数量) */
export function expandHarvestDrop(drop: HarvestDrop): readonly ResourceKind[] {
  if ('bySpecies' in drop) {
    const table = drop.bySpecies === 'seed' ? SEED_OF : FRUIT_OF;
    return TREE_SPECIES.map((species) => table[species]);
  }
  if ('oneOf' in drop) return drop.oneOf;
  return [drop.kind];
}
