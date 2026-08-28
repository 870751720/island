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
};
