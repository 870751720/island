import type { ResourceKind } from './Inventory';

/** 道具静态定义:名称、图标与描述(背包点击道具时展示) */
export type ItemDef = {
  kind: ResourceKind;
  name: string;
  icon: string;
  description: string;
};

export const ITEMS: Record<ResourceKind, ItemDef> = {
  wood: {
    kind: 'wood',
    name: '木材',
    icon: '🪵',
    description: '砍树或捡树枝获得,是制作工具和工作台的基础材料。',
  },
  gravel: {
    kind: 'gravel',
    name: '碎石',
    icon: '🪨',
    description: '从碎石堆捡到的小石块,制作工具的常用材料。',
  },
  stone: {
    kind: 'stone',
    name: '石头',
    icon: '🪨',
    description: '用镐子开采大石块获得,可以用来搭建工作台。',
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
};
