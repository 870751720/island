import { RECIPES, WORKBENCH_UPGRADE_COST, toolName, toolUpgradeFrom } from '@/game/systems/Crafting';
import { BOILABLE, COOKABLE } from '@/game/systems/Food';
import { BREWABLE, BREW_COST } from '@/game/systems/Wine';
import { JUNK_LOOT, POND_FISH, SEA_FISH, TREASURE_LOOT } from '@/game/systems/FishTable';
import { CROP_SPECS } from '@/game/entities/Crop';
import { ANIMAL_LABELS, SPECIES, type AnimalSpecies } from '@/game/entities/Wildlife';
import { FRUIT_OF, SEED_OF, TREE_SPECIES } from '@/game/world/TreeSpecies';
import { CAT_FINDS } from '@/game/companions/CompanionDefinition';
import { POSEIDON_GIFT_KINDS } from '@/game/systems/PoseidonGrace';
import { SMELT_ORE_PER_INGOT } from '@/game/entities/Smelter';
import { LOOM_ROPE_PER_CLOTH } from '@/game/systems/LoomSystem';
import type { ResourceKind } from '@/game/systems/Inventory';

/** 来源分组:详情页顶部的来源标签,也是「获得方式」的归类 */
export type SourceGroup = '合成' | '采集' | '击杀' | '钓鱼' | '种植' | '加工' | '畜牧' | '伙伴' | '赠礼';

/** 获得途径消耗的单件材料(详情页中可点击跳转到该道具) */
export type SourceInput = { kind: ResourceKind; count: number };

/** 一条获得途径:怎么得到这件道具 */
export type ItemSource = {
  group: SourceGroup;
  label: string;
  inputs?: readonly SourceInput[];
  note?: string;
};

const sourceMap = new Map<ResourceKind, ItemSource[]>();

function addSource(kind: ResourceKind, source: ItemSource): void {
  const list = sourceMap.get(kind);
  if (list) {
    if (list.some((s) => s.group === source.group && s.label === source.label && s.note === source.note)) return;
    list.push(source);
  } else {
    sourceMap.set(kind, [source]);
  }
}

function costInputs(cost: Partial<Record<ResourceKind, number>>): SourceInput[] {
  return Object.entries(cost).map(([kind, count]) => ({ kind: kind as ResourceKind, count: count ?? 0 }));
}

function craftLabel(recipe: { station: 'hand' | 'workbench'; minBenchLevel?: number }): string {
  if (recipe.station === 'hand') return '徒手制作';
  return recipe.minBenchLevel && recipe.minBenchLevel > 1 ? `工作台 ${recipe.minBenchLevel} 级` : '工作台';
}

// —— 合成:配方产物与工作台升级 ——
for (const recipe of RECIPES) {
  const kind = recipe.tool ?? recipe.output!;
  const inputs = costInputs(recipe.cost);
  const upgrade = toolUpgradeFrom(recipe);
  const note = [
    upgrade ? `升级自「${toolName(upgrade.tool, upgrade.tier)}」` : undefined,
    recipe.outputCount && recipe.outputCount > 1 ? `单次产出 ×${recipe.outputCount}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  // 工具类同一道具有多级配方,补上配方名区分木斧/石斧/铁斧等
  addSource(kind, {
    group: '合成',
    label: recipe.tool ? `${recipe.name} · ${craftLabel(recipe)}` : craftLabel(recipe),
    inputs,
    note: note || undefined,
  });
}

for (const [level, kind] of [
  [2, 'workbench2'],
  [3, 'workbench3'],
  [4, 'workbench4'],
] as const) {
  const label = `工作台升至 ${level} 级`;
  const inputs = costInputs(WORKBENCH_UPGRADE_COST[level] ?? {});
  addSource(kind, { group: '合成', label, inputs });
}

// —— 采集:镜像 CollectSystem 各资源点产出与铲子挖掘(产出写在闭包里无法遍历,新增产出时同步更新此表) ——
const HARVEST_DROPS: readonly { label: string; drops: readonly { kind: ResourceKind; chance?: boolean }[] }[] = [
  {
    label: '砍树',
    drops: [
      { kind: 'branch' },
      { kind: 'wood' },
      ...TREE_SPECIES.map((species) => ({ kind: SEED_OF[species] })),
      ...TREE_SPECIES.map((species) => ({ kind: FRUIT_OF[species], chance: true })),
      { kind: 'soybeanSeed', chance: true },
    ],
  },
  { label: '树桩', drops: [{ kind: 'branch' }, { kind: 'wood' }] },
  { label: '空手摘果', drops: [{ kind: FRUIT_OF.fruit }, { kind: 'tomatoSeed', chance: true }] },
  { label: '挖石头', drops: [{ kind: 'stone' }, { kind: 'flint', chance: true }] },
  { label: '碎石堆', drops: [{ kind: 'stone' }, { kind: 'flint', chance: true }] },
  { label: '铁矿', drops: [{ kind: 'stone' }, { kind: 'ironOre' }, { kind: 'flint', chance: true }] },
  { label: '陨石', drops: [{ kind: 'stone' }, { kind: 'ironOre' }, { kind: 'flint', chance: true }] },
  { label: '浆果丛', drops: [{ kind: 'berry' }] },
  { label: '灌木丛', drops: [{ kind: 'branch' }, { kind: 'carrotSeed', chance: true }, { kind: 'wheatSeed', chance: true }] },
  { label: '草丛', drops: [{ kind: 'fiber' }, { kind: 'carrotSeed', chance: true }, { kind: 'wheatSeed', chance: true }] },
  { label: '蚯蚓窝', drops: [{ kind: 'worm' }, { kind: 'potatoSeed', chance: true }] },
  { label: '铲子挖走整丛', drops: [{ kind: 'berryBush' }, { kind: 'shrubBush' }, { kind: 'grassTuft' }, { kind: 'wormNest' }] },
];

for (const { label, drops } of HARVEST_DROPS) {
  for (const drop of drops) {
    addSource(drop.kind, { group: '采集', label, note: drop.chance ? '概率获得' : undefined });
  }
}

// —— 击杀:物种战利品表 + lootOf 里的概率掉落 + 弓箭射鸟 ——
for (const config of Object.values(SPECIES)) {
  for (const loot of config.loot) {
    addSource(loot.kind, {
      group: '击杀',
      label: `击杀${config.label}`,
      note: loot.count > 1 ? `掉落 ×${loot.count}` : undefined,
    });
  }
}

export const RARE_KILL_LOOT: readonly { species: AnimalSpecies; kind: ResourceKind; note: string }[] = [
  { species: 'wolf', kind: 'adventureBook', note: '30% 概率' },
  { species: 'bear', kind: 'adventureBook', note: '必掉 ×3' },
  { species: 'bison', kind: 'cornSeed', note: '3% 概率' },
  { species: 'rabbit', kind: 'cabbageSeed', note: '10% 概率' },
  { species: 'bear', kind: 'strawberrySeed', note: '50% 概率' },
];

for (const rare of RARE_KILL_LOOT) {
  addSource(rare.kind, { group: '击杀', label: `击杀${ANIMAL_LABELS[rare.species]}`, note: rare.note });
}
addSource('birdMeat', { group: '击杀', label: '弓箭射落飞鸟' });

// —— 钓鱼:各水域档位的战利品池 ——
const FISH_POOLS: readonly { label: string; entries: readonly { kind: ResourceKind }[]; note?: string }[] = [
  { label: '垂钓杂物', entries: JUNK_LOOT, note: '概率获得' },
  { label: '海里垂钓', entries: [...SEA_FISH[2], ...SEA_FISH[3]] },
  { label: '水洼垂钓', entries: [...POND_FISH[2], ...POND_FISH[3]] },
  { label: '垂钓珍宝', entries: TREASURE_LOOT, note: '局外「碎石成金」挖陨石同池' },
];

for (const pool of FISH_POOLS) {
  for (const entry of pool.entries) {
    addSource(entry.kind, { group: '钓鱼', label: pool.label, note: pool.note });
  }
}

// —— 种植:作物收获产物与返还的种子 ——
for (const spec of Object.values(CROP_SPECS)) {
  addSource(spec.product, { group: '种植', label: `种植${spec.name}`, note: `每次收获 ×${spec.yieldCount}` });
  addSource(spec.seed, { group: '种植', label: `种植${spec.name}`, note: '成熟收获时返还' });
}

// —— 加工:烤/煮/酿/冶炼/纺织的输入输出映射 ——
for (const [raw, cooked] of Object.entries(COOKABLE) as [ResourceKind, ResourceKind][]) {
  addSource(cooked, { group: '加工', label: '火堆烤制', inputs: [{ kind: raw, count: 1 }] });
}
for (const [raw, boiled] of Object.entries(BOILABLE) as [ResourceKind, ResourceKind][]) {
  addSource(boiled, { group: '加工', label: '烹饪台煮汤', inputs: [{ kind: raw, count: 1 }] });
}
for (const [raw, wine] of Object.entries(BREWABLE) as [ResourceKind, ResourceKind][]) {
  addSource(wine, { group: '加工', label: '酿酒桶酿造', inputs: [{ kind: raw, count: BREW_COST }] });
}
addSource('bait', { group: '加工', label: '饵料桶发酵', note: '投放食物发酵产出' });
addSource('ironIngot', { group: '加工', label: '冶炼炉冶炼', inputs: [{ kind: 'ironOre', count: SMELT_ORE_PER_INGOT }] });
addSource('cloth', { group: '加工', label: '纺织机纺织', inputs: [{ kind: 'rope', count: LOOM_ROPE_PER_CLOTH }] });
addSource('deadCampfire', { group: '加工', label: '火堆燃尽后遗留' });

// —— 畜牧:驯养成年动物定时产出 ——
addSource('milk', { group: '畜牧', label: '挤绵羊奶', note: '驯养成羊定时产出' });
addSource('cowMilk', { group: '畜牧', label: '挤野牛奶', note: '驯养成牛定时产出' });
addSource('wool', { group: '畜牧', label: '剪羊毛', note: '用剪刀剪驯养成羊' });

// —— 伙伴:猫咪可乐的觅食收获 ——
for (const find of CAT_FINDS) {
  addSource(find.kind, { group: '伙伴', label: '伙伴「可乐」觅食', note: `伙伴 ${find.stage} 级起可寻获` });
}

// —— 赠礼:新手期死亡庇佑的波塞冬赠礼箱 ——
for (const kind of POSEIDON_GIFT_KINDS) {
  addSource(kind, { group: '赠礼', label: '波塞冬的赠礼箱', note: '新手期死亡庇佑时获得' });
}

/** 分组展示顺序:合成(玩家主动可控)优先,其余按玩法推进节奏 */
const GROUP_ORDER: readonly SourceGroup[] = ['合成', '采集', '击杀', '钓鱼', '种植', '加工', '畜牧', '伙伴', '赠礼'];

/** 某道具的全部获得途径(按分组顺序排列) */
export function itemSourcesOf(kind: ResourceKind): readonly ItemSource[] {
  return (sourceMap.get(kind) ?? [])
    .slice()
    .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
}

/** 某道具的来源分组(详情页顶部标签) */
export function itemSourceGroups(kind: ResourceKind): readonly SourceGroup[] {
  const groups = new Set(sourceMap.get(kind)?.map((source) => source.group));
  return GROUP_ORDER.filter((group) => groups.has(group));
}
