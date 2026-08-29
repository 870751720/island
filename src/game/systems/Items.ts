import type { ResourceKind } from './Inventory';

/** 道具静态定义:名称、图标与描述(背包点击道具时展示) */
export type ItemDef = {
  kind: ResourceKind;
  name: string;
  icon: string;
  description: string;
  /** 可燃物:投入火堆增加的燃烧秒数(未标记的道具不可燃烧) */
  burnTime?: number;
};

export const ITEMS: Record<ResourceKind, ItemDef> = {
  wood: {
    kind: 'wood',
    name: '树枝',
    icon: '🌿',
    description: '砍树、捡灌木丛获得,细而易燃,是制作工具的基础材料,也可以当火堆的柴。',
    burnTime: 20,
  },
  log: {
    kind: 'log',
    name: '木头',
    icon: '🪵',
    description: '砍树获得的木段,耐烧的好柴火,也是搭建火堆的材料。',
    burnTime: 45,
  },
  stone: {
    kind: 'stone',
    name: '石头',
    icon: '🪨',
    description: '从碎石堆捡拾或用镐子开采大石块获得,制作工具和工作台的常用材料。',
  },
  flint: {
    kind: 'flint',
    name: '燧石',
    icon: '⚡',
    description: '敲碎石头时偶尔蹦出的尖锐石片,与木头摩擦就能生起火堆。',
  },
  berry: {
    kind: 'berry',
    name: '浆果',
    icon: '🍒',
    description: '灌木丛中采摘的野果,可以直接食用,恢复少量饥饿和口渴。',
  },
  fiber: {
    kind: 'fiber',
    name: '植物纤维',
    icon: '🌿',
    description: '从草丛里采来的坚韧纤维,可以搓成绳线,是制作绳类道具的基础材料。',
  },
  rope: {
    kind: 'rope',
    name: '绳线',
    icon: '🧵',
    description: '用植物纤维搓成的细绳,结实有韧性,可以用来制作鱼竿等工具。',
  },
  fish: {
    kind: 'fish',
    name: '鱼',
    icon: '🐟',
    description: '在海边或水洼边钓上来的鱼,新鲜有营养,可以直接生吃恢复饥饿。',
  },
  crabMeat: {
    kind: 'crabMeat',
    name: '蟹肉',
    icon: '🦀',
    description: '射杀螃蟹掉落的蟹肉,可以生吃,烤一烤会更鲜美。',
  },
  birdMeat: {
    kind: 'birdMeat',
    name: '鸟肉',
    icon: '🐦',
    description: '射杀小鸟掉落的鸟肉,可以生吃,烤熟后更滋补。',
  },
  cookedBerry: {
    kind: 'cookedBerry',
    name: '烤浆果',
    icon: '🍬',
    description: '火堆上烤过的浆果,糖分焦香,恢复效果更好。',
  },
  cookedFish: {
    kind: 'cookedFish',
    name: '烤鱼',
    icon: '🍢',
    description: '火堆上烤得滋滋作响的鱼,香气扑鼻,恢复大量饥饿。',
  },
  cookedCrabMeat: {
    kind: 'cookedCrabMeat',
    name: '烤蟹肉',
    icon: '🍤',
    description: '烤得通红的蟹肉,鲜甜弹牙,比生吃滋补得多。',
  },
  cookedBirdMeat: {
    kind: 'cookedBirdMeat',
    name: '烤鸟肉',
    icon: '🍗',
    description: '外焦里嫩的烤鸟肉,是荒岛上难得的硬菜。',
  },
  arrow: {
    kind: 'arrow',
    name: '箭',
    icon: '🏹',
    description: '用树枝削成的箭,搭配弓使用;手持弓时会自动射向附近的猎物。',
  },
  axe: {
    kind: 'axe',
    name: '斧子',
    icon: '🪓',
    description: '石斧头绑上树枝柄,砍树的必备工具,放进背包就算拥有。',
  },
  pickaxe: {
    kind: 'pickaxe',
    name: '镐子',
    icon: '⛏️',
    description: '石镐,开采大石块的必备工具,放进背包就算拥有。',
  },
  fishingrod: {
    kind: 'fishingrod',
    name: '鱼竿',
    icon: '🎣',
    description: '细枝绑上绳线做成的鱼竿,站在水边就能钓鱼。',
  },
  bow: {
    kind: 'bow',
    name: '弓',
    icon: '🏹',
    description: '枝干弯成弓身、绳线做弦,手持时会自动射向附近的猎物。',
  },
};
