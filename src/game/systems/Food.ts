import type { ActionType } from '../entities/Player';
import type { InventorySlot, ResourceKind } from './Inventory';
import { HIDDEN_RECIPES } from './HiddenRecipeCatalog';

export type FoodEater = 'rabbit' | 'sheep' | 'bison' | 'wolf' | 'bear' | 'dog' | 'cat';

/** 可食用食物:每种食物有各自的进食动画与特效色 */
export type Food = {
  kind: ResourceKind;
  /** 必填喂食标签；不可喂食时显式填空数组。 */
  eaters: readonly FoodEater[];
  name: string;
  consumeType: 'eat' | 'drink';
  action: Extract<ActionType, 'eat_berry' | 'eat_fish'>;
  fxColor: string;
  hunger: number;
  thirst: number;
  health: number;
};

/** 可食用食物表:每种食物的名称、进食动画与特效色 */
export const FOODS: Food[] = [
  ...HIDDEN_RECIPES.map((r): Food => ({
    kind: r.kind, name: r.name, eaters: [],
    consumeType: r.visual.shape === 'soup' ? 'drink' : 'eat', action: 'eat_berry',
    fxColor: r.visual.color, hunger: r.hunger, thirst: r.thirst, health: r.health,
  })),
  { kind: 'berry', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '浆果', consumeType: 'eat', action: 'eat_berry', fxColor: '#c0392b', hunger: 3, thirst: 2, health: 0 },
  { kind: 'oakFruit', eaters: ['sheep', 'bison', 'bear'], name: '橡果', consumeType: 'eat', action: 'eat_berry', fxColor: '#b5813f', hunger: 1, thirst: 0, health: 0 },
  { kind: 'pineFruit', eaters: [], name: '松果', consumeType: 'eat', action: 'eat_berry', fxColor: '#8a6b45', hunger: 1, thirst: 0, health: 0 },
  { kind: 'fruitFruit', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '苹果', consumeType: 'eat', action: 'eat_berry', fxColor: '#c0392b', hunger: 3, thirst: 2, health: 0 },
  { kind: 'carrot', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '胡萝卜', consumeType: 'eat', action: 'eat_berry', fxColor: '#e07b2a', hunger: 8, thirst: 3, health: 0 },
  { kind: 'cola', eaters: [], name: '可乐', consumeType: 'drink', action: 'eat_berry', fxColor: '#c0392b', hunger: 5, thirst: 10, health: 0 },
  { kind: 'colaZero', eaters: [], name: '无糖可乐', consumeType: 'drink', action: 'eat_berry', fxColor: '#2c3e50', hunger: 0, thirst: 5, health: 0 },
  { kind: 'milk', eaters: [], name: '羊奶', consumeType: 'drink', action: 'eat_berry', fxColor: '#f6f1e4', hunger: 10, thirst: 25, health: 5 },
  { kind: 'cowMilk', eaters: [], name: '牛奶', consumeType: 'drink', action: 'eat_berry', fxColor: '#f6f1e4', hunger: 10, thirst: 25, health: 5 },
  { kind: 'sardine', eaters: ['wolf', 'bear'], name: '沙丁鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#b8cdd9', hunger: 10, thirst: 5, health: 0 },
  { kind: 'shrimp', eaters: ['wolf', 'bear'], name: '虾', consumeType: 'eat', action: 'eat_fish', fxColor: '#e8927c', hunger: 10, thirst: 5, health: 0 },
  { kind: 'loach', eaters: ['wolf', 'bear'], name: '泥鳅', consumeType: 'eat', action: 'eat_fish', fxColor: '#8a7a4a', hunger: 10, thirst: 5, health: 0 },
  { kind: 'perch', eaters: ['wolf', 'bear'], name: '鲈鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#8fa87b', hunger: 10, thirst: 5, health: 0 },
  { kind: 'puffer', eaters: [], name: '河豚', consumeType: 'eat', action: 'eat_fish', fxColor: '#d9c15a', hunger: 10, thirst: 5, health: 0 },
  { kind: 'cuttlefish', eaters: ['wolf', 'bear'], name: '墨鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#6b5f8a', hunger: 10, thirst: 5, health: 0 },
  { kind: 'anchovy', eaters: ['wolf', 'bear'], name: '鳀鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#a9c3cc', hunger: 10, thirst: 5, health: 0 },
  { kind: 'horseMackerel', eaters: ['wolf', 'bear'], name: '竹荚鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#8ba3a0', hunger: 10, thirst: 5, health: 0 },
  { kind: 'yellowCroaker', eaters: ['wolf', 'bear'], name: '小黄鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#e3c56d', hunger: 10, thirst: 5, health: 0 },
  { kind: 'saury', eaters: ['wolf', 'bear'], name: '秋刀鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#7d97a8', hunger: 10, thirst: 5, health: 0 },
  { kind: 'hairtail', eaters: ['wolf', 'bear'], name: '带鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#cfd8dc', hunger: 10, thirst: 5, health: 0 },
  { kind: 'grouper', eaters: ['wolf', 'bear'], name: '石斑鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#6d7b5a', hunger: 20, thirst: 10, health: 0 },
  { kind: 'catfish', eaters: ['wolf', 'bear'], name: '巨鲶', consumeType: 'eat', action: 'eat_fish', fxColor: '#5b664f', hunger: 20, thirst: 10, health: 0 },
  { kind: 'grassCarp', eaters: ['wolf', 'bear'], name: '草鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#7ba05b', hunger: 20, thirst: 10, health: 0 },
  { kind: 'swordfish', eaters: ['wolf', 'bear'], name: '剑鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#5a7d9e', hunger: 20, thirst: 10, health: 0 },
  { kind: 'manta', eaters: ['wolf', 'bear'], name: '魔鬼鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#4a5568', hunger: 20, thirst: 10, health: 0 },
  { kind: 'goldenFish', eaters: ['wolf', 'bear'], name: '黄金鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#e6b422', hunger: 50, thirst: 50, health: 50 },
  { kind: 'crabMeat', eaters: ['wolf', 'bear'], name: '蟹肉', consumeType: 'eat', action: 'eat_fish', fxColor: '#e2793a', hunger: 5, thirst: 2, health: 0 },
  { kind: 'birdMeat', eaters: ['wolf', 'bear'], name: '鸟肉', consumeType: 'eat', action: 'eat_fish', fxColor: '#c98a5a', hunger: 5, thirst: 2, health: 0 },
  { kind: 'gameMeat', eaters: ['wolf', 'bear'], name: '兽肉', consumeType: 'eat', action: 'eat_fish', fxColor: '#b04a3a', hunger: 10, thirst: 5, health: 0 },
  { kind: 'cookedBerry', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '烤浆果', consumeType: 'eat', action: 'eat_berry', fxColor: '#a0522d', hunger: 5, thirst: 1, health: 1 },
  { kind: 'cookedSmallFish', eaters: ['wolf', 'bear', 'dog', 'cat'], name: '烤小鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#d99a4e', hunger: 20, thirst: 10, health: 10 },
  { kind: 'cookedBigFish', eaters: ['wolf', 'bear', 'dog', 'cat'], name: '烤大鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#c76b3a', hunger: 40, thirst: 20, health: 20 },
  { kind: 'cookedGoldenFish', eaters: ['wolf', 'bear', 'dog', 'cat'], name: '烤黄金鱼', consumeType: 'eat', action: 'eat_fish', fxColor: '#e6b422', hunger: 100, thirst: 100, health: 100 },
  { kind: 'cookedCrabMeat', eaters: ['wolf', 'bear', 'dog', 'cat'], name: '烤蟹肉', consumeType: 'eat', action: 'eat_fish', fxColor: '#e8703a', hunger: 8, thirst: 1, health: 2 },
  { kind: 'cookedBirdMeat', eaters: ['wolf', 'bear', 'dog', 'cat'], name: '烤鸟肉', consumeType: 'eat', action: 'eat_fish', fxColor: '#b5722f', hunger: 8, thirst: 1, health: 2 },
  { kind: 'cookedGameMeat', eaters: ['wolf', 'bear', 'dog', 'cat'], name: '烤兽肉', consumeType: 'eat', action: 'eat_fish', fxColor: '#9c4a2f', hunger: 30, thirst: 20, health: 20 },
  { kind: 'boiledBerry', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '煮浆果', consumeType: 'eat', action: 'eat_berry', fxColor: '#7a5cb0', hunger: 6, thirst: 3, health: 2 },
  { kind: 'boiledSmallFish', eaters: ['wolf', 'bear', 'dog', 'cat'], name: '鲜鱼汤', consumeType: 'drink', action: 'eat_fish', fxColor: '#d9b98a', hunger: 15, thirst: 20, health: 12 },
  { kind: 'boiledBigFish', eaters: ['wolf', 'bear', 'dog', 'cat'], name: '大鱼汤', consumeType: 'drink', action: 'eat_fish', fxColor: '#c9a06a', hunger: 25, thirst: 40, health: 24 },
  { kind: 'boiledGoldenFish', eaters: ['wolf', 'bear', 'dog', 'cat'], name: '黄金鱼汤', consumeType: 'drink', action: 'eat_fish', fxColor: '#e6b422', hunger: 100, thirst: 100, health: 100 },
  { kind: 'boiledCrabMeat', eaters: ['wolf', 'bear', 'dog', 'cat'], name: '煮蟹肉', consumeType: 'eat', action: 'eat_fish', fxColor: '#e07a5a', hunger: 10, thirst: 5, health: 3 },
  { kind: 'boiledBirdMeat', eaters: ['wolf', 'bear', 'dog', 'cat'], name: '鸟肉汤', consumeType: 'drink', action: 'eat_fish', fxColor: '#c4a06a', hunger: 10, thirst: 5, health: 3 },
  { kind: 'boiledGameMeat', eaters: ['wolf', 'bear', 'dog', 'cat'], name: '兽肉汤', consumeType: 'drink', action: 'eat_fish', fxColor: '#a06a4a', hunger: 15, thirst: 28, health: 24 },
  { kind: 'cookedCarrot', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '烤胡萝卜', consumeType: 'eat', action: 'eat_berry', fxColor: '#c96a2a', hunger: 12, thirst: 1, health: 2 },
  { kind: 'boiledCarrot', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '胡萝卜汤', consumeType: 'drink', action: 'eat_berry', fxColor: '#d98a4a', hunger: 10, thirst: 5, health: 3 },
  { kind: 'flour', eaters: [], name: '面粉', consumeType: 'eat', action: 'eat_berry', fxColor: '#f3e7ce', hunger: 5, thirst: -10, health: 1 },
  { kind: 'bread', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '烤面包', consumeType: 'eat', action: 'eat_berry', fxColor: '#d9a441', hunger: 15, thirst: 0, health: 3 },
  { kind: 'potato', eaters: ['rabbit', 'sheep', 'bison', 'bear'], name: '土豆', consumeType: 'eat', action: 'eat_berry', fxColor: '#c9a06a', hunger: 5, thirst: 0, health: 0 },
  { kind: 'sweetPotato', eaters: ['rabbit', 'sheep', 'bison', 'bear'], name: '红薯', consumeType: 'eat', action: 'eat_berry', fxColor: '#c96a3a', hunger: 6, thirst: 1, health: 0 },
  { kind: 'corn', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '玉米', consumeType: 'eat', action: 'eat_berry', fxColor: '#e8c56a', hunger: 6, thirst: 1, health: 0 },
  { kind: 'soybean', eaters: ['rabbit', 'sheep', 'bison', 'bear'], name: '大豆', consumeType: 'eat', action: 'eat_berry', fxColor: '#9aa74e', hunger: 3, thirst: 1, health: 0 },
  { kind: 'tomato', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '番茄', consumeType: 'eat', action: 'eat_berry', fxColor: '#d94a3a', hunger: 4, thirst: 3, health: 1 },
  { kind: 'pepper', eaters: [], name: '辣椒', consumeType: 'eat', action: 'eat_berry', fxColor: '#d93a2a', hunger: 2, thirst: 0, health: 2 },
  { kind: 'eggplant', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '茄子', consumeType: 'eat', action: 'eat_berry', fxColor: '#6a3a8a', hunger: 4, thirst: 1, health: 0 },
  { kind: 'strawberry', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '草莓', consumeType: 'eat', action: 'eat_berry', fxColor: '#d93a4a', hunger: 5, thirst: 4, health: 1 },
  { kind: 'cabbage', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '卷心菜', consumeType: 'eat', action: 'eat_berry', fxColor: '#8fc47a', hunger: 6, thirst: 2, health: 0 },
  { kind: 'pumpkin', eaters: ['rabbit', 'sheep', 'bison', 'bear'], name: '南瓜', consumeType: 'eat', action: 'eat_berry', fxColor: '#e0862a', hunger: 8, thirst: 2, health: 0 },
  { kind: 'cookedPotato', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '烤土豆', consumeType: 'eat', action: 'eat_berry', fxColor: '#c9a06a', hunger: 14, thirst: 0, health: 2 },
  { kind: 'boiledPotato', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '土豆汤', consumeType: 'drink', action: 'eat_berry', fxColor: '#d9b98a', hunger: 11, thirst: 6, health: 3 },
  { kind: 'cookedSweetPotato', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '烤红薯', consumeType: 'eat', action: 'eat_berry', fxColor: '#c96a3a', hunger: 16, thirst: 2, health: 3 },
  { kind: 'boiledSweetPotato', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '红薯粥', consumeType: 'drink', action: 'eat_berry', fxColor: '#d99a6a', hunger: 12, thirst: 8, health: 4 },
  { kind: 'cookedCorn', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '烤玉米', consumeType: 'eat', action: 'eat_berry', fxColor: '#e8c56a', hunger: 13, thirst: 1, health: 2 },
  { kind: 'boiledCorn', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '玉米汤', consumeType: 'drink', action: 'eat_berry', fxColor: '#e3c56d', hunger: 10, thirst: 6, health: 3 },
  { kind: 'cookedSoybean', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '烤豆', consumeType: 'eat', action: 'eat_berry', fxColor: '#9aa74e', hunger: 10, thirst: 1, health: 3 },
  { kind: 'boiledSoybean', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '豆汤', consumeType: 'drink', action: 'eat_berry', fxColor: '#c9b98a', hunger: 8, thirst: 10, health: 5 },
  { kind: 'cookedTomato', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '烤番茄', consumeType: 'eat', action: 'eat_berry', fxColor: '#d94a3a', hunger: 8, thirst: 2, health: 2 },
  { kind: 'boiledTomato', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '番茄汤', consumeType: 'drink', action: 'eat_berry', fxColor: '#d96a4a', hunger: 7, thirst: 9, health: 4 },
  { kind: 'cookedPepper', eaters: [], name: '烤辣椒', consumeType: 'eat', action: 'eat_berry', fxColor: '#d93a2a', hunger: 6, thirst: 0, health: 4 },
  { kind: 'boiledPepper', eaters: [], name: '辣椒汤', consumeType: 'drink', action: 'eat_berry', fxColor: '#c94a2a', hunger: 5, thirst: 4, health: 6 },
  { kind: 'cookedEggplant', eaters: ['rabbit', 'sheep', 'bison', 'bear'], name: '烤茄子', consumeType: 'eat', action: 'eat_berry', fxColor: '#6a3a8a', hunger: 12, thirst: 1, health: 3 },
  { kind: 'boiledEggplant', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '茄子汤', consumeType: 'drink', action: 'eat_berry', fxColor: '#8a5aaa', hunger: 9, thirst: 6, health: 4 },
  { kind: 'cookedStrawberry', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '烤草莓', consumeType: 'eat', action: 'eat_berry', fxColor: '#d93a4a', hunger: 7, thirst: 1, health: 2 },
  { kind: 'boiledStrawberry', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '草莓汤', consumeType: 'drink', action: 'eat_berry', fxColor: '#e38ab0', hunger: 6, thirst: 8, health: 4 },
  { kind: 'cookedCabbage', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '烤卷心菜', consumeType: 'eat', action: 'eat_berry', fxColor: '#8fc47a', hunger: 10, thirst: 2, health: 2 },
  { kind: 'boiledCabbage', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '蔬菜汤', consumeType: 'drink', action: 'eat_berry', fxColor: '#a9c47a', hunger: 8, thirst: 8, health: 4 },
  { kind: 'cookedPumpkin', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '烤南瓜', consumeType: 'eat', action: 'eat_berry', fxColor: '#e0862a', hunger: 18, thirst: 3, health: 4 },
  { kind: 'boiledPumpkin', eaters: ['rabbit', 'sheep', 'bison', 'bear', 'dog'], name: '南瓜浓汤', consumeType: 'drink', action: 'eat_berry', fxColor: '#e8a04a', hunger: 14, thirst: 12, health: 6 },
  { kind: 'wineBerry', eaters: [], name: '浆果酒', consumeType: 'drink', action: 'eat_berry', fxColor: '#a34a6b', hunger: 4, thirst: 2, health: 0 },
  { kind: 'wineFruit', eaters: [], name: '苹果酒', consumeType: 'drink', action: 'eat_berry', fxColor: '#d9a441', hunger: 8, thirst: 4, health: 0 },
  { kind: 'wineMilk', eaters: [], name: '奶酒', consumeType: 'drink', action: 'eat_berry', fxColor: '#f0e6d2', hunger: 10, thirst: 15, health: 5 },
  { kind: 'wineGolden', eaters: [], name: '黄金酒', consumeType: 'drink', action: 'eat_berry', fxColor: '#e6b422', hunger: 30, thirst: 30, health: 30 },
];

/** 饵料桶兑换表:每 1 个食物发酵出的鱼饵数(不在表内的食物不可投入);熟食与生食兑换相同,大体按获取难度定价:基础采集 2、小鱼/肉 4-6、大鱼 10、兽肉 10、黄金鱼 40 */
export const BAIT_YIELD: Partial<Record<ResourceKind, number>> = {
  worm: 2,
  oakFruit: 2,
  pineFruit: 2,
  berry: 2,
  cola: 2,
  colaZero: 2,
  fruitFruit: 4,
  carrot: 4,
  sardine: 4,
  shrimp: 4,
  loach: 4,
  perch: 4,
  puffer: 4,
  cuttlefish: 4,
  anchovy: 4,
  horseMackerel: 4,
  yellowCroaker: 4,
  saury: 4,
  hairtail: 4,
  crabMeat: 4,
  birdMeat: 6,
  grouper: 10,
  catfish: 10,
  grassCarp: 10,
  swordfish: 10,
  manta: 10,
  gameMeat: 10,
  goldenFish: 40,
  cookedBerry: 2,
  cookedCarrot: 4,
  boiledCarrot: 4,
  bread: 2,
  potato: 4,
  cookedPotato: 4,
  boiledPotato: 4,
  sweetPotato: 4,
  cookedSweetPotato: 4,
  boiledSweetPotato: 4,
  corn: 4,
  cookedCorn: 4,
  boiledCorn: 4,
  soybean: 2,
  cookedSoybean: 2,
  boiledSoybean: 2,
  tomato: 2,
  cookedTomato: 2,
  boiledTomato: 2,
  pepper: 2,
  cookedPepper: 2,
  boiledPepper: 2,
  eggplant: 4,
  cookedEggplant: 4,
  boiledEggplant: 4,
  strawberry: 2,
  cookedStrawberry: 2,
  boiledStrawberry: 2,
  cabbage: 4,
  cookedCabbage: 4,
  boiledCabbage: 4,
  pumpkin: 4,
  cookedPumpkin: 4,
  boiledPumpkin: 4,
  cookedCrabMeat: 4,
  cookedBirdMeat: 6,
  cookedSmallFish: 4,
  cookedBigFish: 10,
  cookedGameMeat: 10,
  cookedGoldenFish: 40,
};

/** 烹饪映射:生食在燃烧的火堆上烤成熟食,效果增强;不可烤的食材不在表中 */
export const COOKABLE: Partial<Record<ResourceKind, ResourceKind>> = {  berry: 'cookedBerry',
  sardine: 'cookedSmallFish',
  shrimp: 'cookedSmallFish',
  loach: 'cookedSmallFish',
  perch: 'cookedSmallFish',
  puffer: 'cookedSmallFish',
  cuttlefish: 'cookedSmallFish',
  anchovy: 'cookedSmallFish',
  horseMackerel: 'cookedSmallFish',
  yellowCroaker: 'cookedSmallFish',
  saury: 'cookedSmallFish',
  hairtail: 'cookedSmallFish',
  grouper: 'cookedBigFish',
  catfish: 'cookedBigFish',
  grassCarp: 'cookedBigFish',
  swordfish: 'cookedBigFish',
  manta: 'cookedBigFish',
  goldenFish: 'cookedGoldenFish',
  crabMeat: 'cookedCrabMeat',
  birdMeat: 'cookedBirdMeat',
  gameMeat: 'cookedGameMeat',
  carrot: 'cookedCarrot',
  flour: 'bread',
  potato: 'cookedPotato',
  sweetPotato: 'cookedSweetPotato',
  corn: 'cookedCorn',
  soybean: 'cookedSoybean',
  tomato: 'cookedTomato',
  pepper: 'cookedPepper',
  eggplant: 'cookedEggplant',
  strawberry: 'cookedStrawberry',
  cabbage: 'cookedCabbage',
  pumpkin: 'cookedPumpkin',
};

/** 可烹饪(烤或煮)的生食材种类,供背包检查等场景遍历 */
export const COOKABLE_KINDS = Object.keys(COOKABLE) as ResourceKind[];

/**
 * 煮制映射:生食在燃烧的烹饪台上煮成汤品(每份 5 秒,一次只能煮一种食材);
 * 与烤制同源,但汤品口渴恢复更高、饥饿略低。不可煮的食材不在表中。
 */
export const BOILABLE: Partial<Record<ResourceKind, ResourceKind>> = {
  berry: 'boiledBerry',
  sardine: 'boiledSmallFish',
  shrimp: 'boiledSmallFish',
  loach: 'boiledSmallFish',
  perch: 'boiledSmallFish',
  puffer: 'boiledSmallFish',
  cuttlefish: 'boiledSmallFish',
  anchovy: 'boiledSmallFish',
  horseMackerel: 'boiledSmallFish',
  yellowCroaker: 'boiledSmallFish',
  saury: 'boiledSmallFish',
  hairtail: 'boiledSmallFish',
  grouper: 'boiledBigFish',
  catfish: 'boiledBigFish',
  grassCarp: 'boiledBigFish',
  swordfish: 'boiledBigFish',
  manta: 'boiledBigFish',
  goldenFish: 'boiledGoldenFish',
  crabMeat: 'boiledCrabMeat',
  birdMeat: 'boiledBirdMeat',
  gameMeat: 'boiledGameMeat',
  carrot: 'boiledCarrot',
  potato: 'boiledPotato',
  sweetPotato: 'boiledSweetPotato',
  corn: 'boiledCorn',
  soybean: 'boiledSoybean',
  tomato: 'boiledTomato',
  pepper: 'boiledPepper',
  eggplant: 'boiledEggplant',
  strawberry: 'boiledStrawberry',
  cabbage: 'boiledCabbage',
  pumpkin: 'boiledPumpkin',
};

/** 按背包格子顺序找第一个食物(「背包里最前面的食物」) */
export function firstFoodIn(slots: readonly InventorySlot[]): Food | undefined {
  for (const slot of slots) {
    if (!slot) continue;
    const food = FOODS.find((f) => f.kind === slot.kind);
    if (food) return food;
  }
  return undefined;
}

/** 进食卡片的弹出阈值:饥饿低于该值才提示(%) */
export const EAT_PROMPT_HUNGER = 20;

/** 按背包格子顺序找第一个食物及其总持有数(进食卡「吃饱」按钮按数量决定是否出现) */
export function firstFoodEntryIn(
  slots: readonly InventorySlot[]
): { food: Food; count: number } | undefined {
  for (const slot of slots) {
    if (!slot) continue;
    const food = FOODS.find((f) => f.kind === slot.kind);
    if (food) {
      const count = slots.reduce((n, s) => (s && s.kind === slot.kind ? n + s.count : n), 0);
      return { food, count };
    }
  }
  return undefined;
}

/** 食物定义统一驱动文案、动作与声音。 */
export function foodVerb(food: Food): '吃' | '喝' {
  return food.consumeType === 'drink' ? '喝' : '吃';
}

export function foodAction(food: Food): ActionType {
  return food.consumeType === 'drink' ? 'drink' : food.action;
}

export function foodSound(food: Food): 'drink' | 'munch' {
  return food.consumeType === 'drink' ? 'drink' : 'munch';
}
