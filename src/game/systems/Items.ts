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
  cola: {
    kind: 'cola',
    name: '可乐',
    icon: '🥤',
    description: '海里钓上来的易拉罐,居然没漏气!喝下去又解渴又顶饱。',
  },
  colaZero: {
    kind: 'colaZero',
    name: '无糖可乐',
    icon: '🥤',
    description: '无糖版本,清爽解渴,喝了个寂寞但至少不渴了。',
  },
  bottle: {
    kind: 'bottle',
    name: '漂流瓶',
    icon: '🍾',
    description: '随波逐流的玻璃瓶,点击「使用」拔开瓶塞,读一读陌生人留下的字条,读完瓶子就没了。',
  },
  sardine: {
    kind: 'sardine',
    name: '沙丁鱼',
    icon: '🐟',
    description: '银光闪闪的小鱼,量大街货,生吃恢复少量饥饿。',
  },
  perch: {
    kind: 'perch',
    name: '鲈鱼',
    icon: '🐠',
    description: '常见的食用鱼,肉质鲜美,可以直接生吃。',
  },
  shrimp: {
    kind: 'shrimp',
    name: '虾',
    icon: '🦐',
    description: '活蹦乱跳的小虾,生吃爽口,烤熟后变红更香。',
  },
  loach: {
    kind: 'loach',
    name: '泥鳅',
    icon: '🐟',
    description: '水洼里滑不留手的细长小鱼,全身都是蛋白质。',
  },
  puffer: {
    kind: 'puffer',
    name: '河豚',
    icon: '🐡',
    description: '鼓成球的河豚,处理得当就是美味……大概吧。',
  },
  cuttlefish: {
    kind: 'cuttlefish',
    name: '墨鱼',
    icon: '🦑',
    description: '扁扁的墨鱼,喷出的墨汁染黑了半片海水。',
  },
  grouper: {
    kind: 'grouper',
    name: '石斑鱼',
    icon: '🐠',
    description: '体型敦实的大鱼,钓上它需要连续快速提竿,烤着吃极其滋补。',
  },
  catfish: {
    kind: 'catfish',
    name: '巨鲶',
    icon: '🐡',
    description: '水洼深处的庞然大物,浑身滑腻,力气大得吓人。',
  },
  swordfish: {
    kind: 'swordfish',
    name: '剑鱼',
    icon: '🗡️',
    description: '长着长剑般吻部的大鱼,海中的疾速猎手。',
  },
  manta: {
    kind: 'manta',
    name: '魔鬼鱼',
    icon: '🪁',
    description: '扁菱形的深海滑翔者,钓上它绝对值得吹嘘一整天。',
  },
  goldenFish: {
    kind: 'goldenFish',
    name: '黄金鱼',
    icon: '✨',
    description: '通体金光闪闪的传说之鱼!吃掉它能大幅恢复饥饿与口渴,也可留作收藏。',
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
  gameMeat: {
    kind: 'gameMeat',
    name: '兽肉',
    icon: '🍖',
    description: '猎捕兔、羊、鹿或熊得到的兽肉,可以生吃,烤熟后是大补的硬菜。',
  },
  fur: {
    kind: 'fur',
    name: '皮毛',
    icon: '🐾',
    description: '猎捕野兽剥下的皮毛,御寒耐磨,是缝制皮制装备的核心材料。',
  },
  cookedBerry: {
    kind: 'cookedBerry',
    name: '烤浆果',
    icon: '🍬',
    description: '火堆上烤过的浆果,糖分焦香,恢复效果更好。',
  },
  cookedSmallFish: {
    kind: 'cookedSmallFish',
    name: '烤小鱼',
    icon: '🍢',
    description: '火堆上烤得滋滋作响的小鱼,香气扑鼻,恢复饥饿、口渴还补健康。',
  },
  cookedBigFish: {
    kind: 'cookedBigFish',
    name: '烤大鱼',
    icon: '🍡',
    description: '火堆上烤熟的大鱼,外焦里嫩,是滋补的硬菜。',
  },
  cookedGoldenFish: {
    kind: 'cookedGoldenFish',
    name: '烤黄金鱼',
    icon: '🌟',
    description: '烤得金光四溢的传说之鱼,一口回满所有状态!',
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
  cookedGameMeat: {
    kind: 'cookedGameMeat',
    name: '烤兽肉',
    icon: '🥩',
    description: '火堆上烤得焦香的大块兽肉,荒岛盛宴的主菜。',
  },
  arrow: {
    kind: 'arrow',
    name: '箭',
    icon: '🏹',
    description: '用树枝削成的箭,搭配弓使用;手持弓时会自动射向附近的猎物。',
  },
  oakSeed: {
    kind: 'oakSeed',
    name: '橡树种子',
    icon: '🌰',
    description: '砍橡树偶尔掉落的种子,手持种子站定空地 2 秒即可种下一棵橡树,结出的橡果可以食用。',
  },
  pineSeed: {
    kind: 'pineSeed',
    name: '松树种子',
    icon: '🌱',
    description: '砍松树偶尔掉落的种子,手持种子站定空地 2 秒即可种下一棵松树,结出的松果可以食用。',
  },
  fruitSeed: {
    kind: 'fruitSeed',
    name: '果树种子',
    icon: '🍏',
    description: '砍果树偶尔掉落的种子,手持种子站定空地 2 秒即可种下一棵果树,结出的红果可以食用。',
  },
  oakFruit: {
    kind: 'oakFruit',
    name: '橡果',
    icon: '🥜',
    description: '砍橡树偶尔掉落的果实,可以直接食用,恢复少量饥饿和口渴。',
  },
  pineFruit: {
    kind: 'pineFruit',
    name: '松果',
    icon: '🌲',
    description: '砍松树偶尔掉落的果实,可以直接食用,恢复少量饥饿和口渴。',
  },
  fruitFruit: {
    kind: 'fruitFruit',
    name: '红果',
    icon: '🍎',
    description: '砍果树偶尔掉落的果实,可以直接食用,恢复少量饥饿和口渴。',
  },
  axe: {
    kind: 'axe',
    name: '石斧',
    icon: '🪓',
    description: '石斧头绑上树枝柄,砍树的必备工具;二级工作台可升级为精致石斧。',
  },
  pickaxe: {
    kind: 'pickaxe',
    name: '石镐',
    icon: '⛏️',
    description: '石镐,开采大石块的必备工具;二级工作台可升级为精致石镐。',
  },
  hoe: {
    kind: 'hoe',
    name: '石锄',
    icon: '⚒️',
    description: '石锄刃绑上树枝柄。手持锄头可以把浆果丛、灌木丛整棵挖出来搬走;二级工作台可升级为精致石锄。',
  },
  fishingrod: {
    kind: 'fishingrod',
    name: '树枝鱼竿',
    icon: '🎣',
    description: '细枝绑上绳线做成的鱼竿,站在水边就能钓鱼;二级工作台可升级为精致鱼竿。',
  },
  bow: {
    kind: 'bow',
    name: '粗制弓',
    icon: '🏹',
    description: '枝干弯成弓身、绳线做弦,手持时会自动射向附近的猎物;二级工作台可升级为精致弓。',
  },
  grassShirt: {
    kind: 'grassShirt',
    name: '草衣',
    icon: '🍃',
    description: '草茎木片捆成的简易上衣,防御 +1。',
  },
  grassPants: {
    kind: 'grassPants',
    name: '草裤',
    icon: '🍂',
    description: '草叶围成的遮羞短裤,防御 +1。',
  },
  strawHat: {
    kind: 'strawHat',
    name: '草帽',
    icon: '👒',
    description: '干草编的宽檐帽,口渴速度 -5%。',
  },
  strawBackpack: {
    kind: 'strawBackpack',
    name: '草包',
    icon: '🎒',
    description: '草绳编的背包,背上了就能多带 4 件东西(背包 14 格)。',
  },
  furShirt: {
    kind: 'furShirt',
    name: '皮衣',
    icon: '👕',
    description: '兽皮缝制的厚实上衣,防御 +3。',
  },
  furPants: {
    kind: 'furPants',
    name: '皮裤',
    icon: '👖',
    description: '兽皮裹腿的长裤,防御 +2。',
  },
  furHat: {
    kind: 'furHat',
    name: '皮帽',
    icon: '🎩',
    description: '皮毛缝的圆帽,防御 +1,口渴速度 -5%。',
  },
  furBackpack: {
    kind: 'furBackpack',
    name: '皮包',
    icon: '🧺',
    description: '皮料缝制的大背囊,装得下半座岛(背包 18 格)。',
  },
  crate: {
    kind: 'crate',
    name: '木箱',
    icon: '📦',
    description: '木板钉成的收纳箱。手持木箱站定空地 2 秒即可放到地上,之后靠近可以打开,存取 10 格物品。',
  },
  berryBush: {
    kind: 'berryBush',
    name: '浆果丛',
    icon: '🍓',
    description: '用锄头挖出来的完整浆果丛。点击「使用」把它种回脚下(不能在水里,脚下也不能有别的东西),之后还能再结果。',
  },
  shrubBush: {
    kind: 'shrubBush',
    name: '灌木丛',
    icon: '🌿',
    description: '用锄头挖出来的完整灌木丛。点击「使用」把它种回脚下(不能在水里,脚下也不能有别的东西),之后还能再长树枝。',
  },
};
