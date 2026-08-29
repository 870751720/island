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
  treasureMap: {
    kind: 'treasureMap',
    name: '藏宝图碎片',
    icon: '🗺️',
    description: '泡得发黄的图纸残片,上面画着岛的一角……集齐也许能找到什么。',
  },
  goldenFish: {
    kind: 'goldenFish',
    name: '黄金鱼',
    icon: '✨',
    description: '通体金光闪闪的传说之鱼!吃掉它能大幅恢复饥饿与口渴,也可留作收藏。',
  },
  oldHook: {
    kind: 'oldHook',
    name: '旧鱼钩',
    icon: '🪝',
    description: '锈迹斑斑的精制鱼钩,不知道是哪位前辈渔人留下的,或许能做成好竿。',
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
  leafShirt: {
    kind: 'leafShirt',
    name: '树叶衣',
    icon: '🍃',
    description: '用大片树叶串成的简易上衣,聊胜于无。装备评分 1。',
  },
  fiberShirt: {
    kind: 'fiberShirt',
    name: '纤维衣',
    icon: '👕',
    description: '植物纤维紧密编织的衣服,耐磨又体面。装备评分 3。',
  },
  leafPants: {
    kind: 'leafPants',
    name: '树叶裤',
    icon: '🍂',
    description: '树叶围成的遮羞短裤,荒岛求生的第一步。装备评分 1。',
  },
  fiberPants: {
    kind: 'fiberPants',
    name: '纤维裤',
    icon: '👖',
    description: '纤维编织的长裤,行动利落不扎皮肤。装备评分 3。',
  },
  strawHat: {
    kind: 'strawHat',
    name: '草帽',
    icon: '👒',
    description: '干草编的宽檐帽,白天烈日下也能凉快些。装备评分 2。',
  },
  vineHat: {
    kind: 'vineHat',
    name: '藤编帽',
    icon: '🎩',
    description: '藤条一圈圈盘成的结实帽子,风雨都不怕。装备评分 4。',
  },
  strawBackpack: {
    kind: 'strawBackpack',
    name: '草编背包',
    icon: '🎒',
    description: '草绳编的背包,背上了就能多带 4 件东西(背包 14 格)。装备评分 2。',
  },
  frameBackpack: {
    kind: 'frameBackpack',
    name: '木架背包',
    icon: '🧺',
    description: '木框绑绳的大背囊,装得下半座岛(背包 18 格)。装备评分 4。',
  },
};
