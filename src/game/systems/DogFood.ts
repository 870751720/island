import { FOODS, type Food } from './Food';
import type { ResourceKind } from './Inventory';

/** 按食材与现有道具描述筛选；这是游戏喂食规则，熟食默认取无骨、去核的可食部分。 */
export const DOG_FOOD_EXCLUSIONS: Partial<Record<ResourceKind, string>> = {
  oakFruit: '橡果含单宁，不适合狗狗',
  pineFruit: '松果坚硬，不作为狗狗食物',
  cola: '含咖啡因', colaZero: '含咖啡因',
  wineBerry: '含酒精', wineFruit: '含酒精', wineMilk: '含酒精', wineGolden: '含酒精',
  pepper: '辛辣刺激', cookedPepper: '辛辣刺激', boiledPepper: '辛辣刺激',
  cookedEggplant: '道具描述含蒜，不适合狗狗',
  milk: '羊奶可能引起乳糖不耐受，保守排除',
  potato: '生土豆不适合狗狗', sweetPotato: '红薯煮熟后再喂',
  soybean: '大豆煮熟后再喂', pumpkin: '南瓜煮熟后再喂',
  crabMeat: '肉类煮熟后再喂', birdMeat: '肉类煮熟后再喂', gameMeat: '肉类煮熟后再喂',
  sardine: '鱼虾煮熟后再喂', shrimp: '鱼虾煮熟后再喂', loach: '鱼虾煮熟后再喂',
  perch: '鱼虾煮熟后再喂', puffer: '河豚有毒素风险', cuttlefish: '鱼虾煮熟后再喂',
  anchovy: '鱼虾煮熟后再喂', horseMackerel: '鱼虾煮熟后再喂', yellowCroaker: '鱼虾煮熟后再喂',
  saury: '鱼虾煮熟后再喂', hairtail: '鱼虾煮熟后再喂', grouper: '鱼虾煮熟后再喂',
  catfish: '鱼虾煮熟后再喂', grassCarp: '鱼虾煮熟后再喂', swordfish: '鱼虾煮熟后再喂',
  manta: '鱼虾煮熟后再喂', goldenFish: '鱼虾煮熟后再喂',
};

export const DOG_FOODS = FOODS.filter(food => !DOG_FOOD_EXCLUSIONS[food.kind]);
const foods = new Map(DOG_FOODS.map(food => [food.kind, food]));

export function dogFood(kind: ResourceKind): Food | undefined {
  return foods.get(kind);
}
