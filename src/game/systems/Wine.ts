import type { ResourceKind } from './Inventory';

/** 每 2 个原料酿造 1 瓶酒 */
export const BREW_COST = 2;

/** 每瓶酒的发酵时长(秒) */
export const BREW_INTERVAL = 45;

/** 舒爽状态下再喝酒转为晕晕的,持续秒数 */
export const TIPSY_DURATION = 60;

/** 一瓶酒的定义:酒的道具 kind、喝下后的三维恢复与「舒爽」时长 */
export type WineDef = {
  kind: ResourceKind;
  name: string;
  fxColor: string;
  hunger: number;
  thirst: number;
  health: number;
  /** 「舒爽」增益时长(秒) */
  refresh: number;
};

/** 酒表:按获取难度定价,恢复与舒爽时长逐档提升 */
export const WINES: WineDef[] = [
  { kind: 'wineBerry', name: '浆果酒', fxColor: '#a34a6b', hunger: 4, thirst: 2, health: 0, refresh: 45 },
  { kind: 'wineFruit', name: '苹果酒', fxColor: '#d9a441', hunger: 8, thirst: 4, health: 0, refresh: 60 },
  { kind: 'wineMilk', name: '奶酒', fxColor: '#f0e6d2', hunger: 10, thirst: 15, health: 5, refresh: 60 },
  { kind: 'wineGolden', name: '黄金酒', fxColor: '#e6b422', hunger: 30, thirst: 30, health: 30, refresh: 90 },
];

/** 酿造映射:原料 → 酿出的酒(不在表内的食材不可投入);酒本身不可再酿 */
export const BREWABLE: Partial<Record<ResourceKind, ResourceKind>> = {
  berry: 'wineBerry',
  fruitFruit: 'wineFruit',
  milk: 'wineMilk',
  goldenFish: 'wineGolden',
};

/** 某种酒的定义(非酒为 undefined) */
export function wineOf(kind: ResourceKind): WineDef | undefined {
  return WINES.find((w) => w.kind === kind);
}

/** 该道具是否是酒(文案用:酒是「喝」不是「吃」) */
export function isWineKind(kind: ResourceKind): boolean {
  return WINES.some((w) => w.kind === kind);
}
