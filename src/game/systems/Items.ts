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

/** 物品分类(GM 面板二级 tab),顺序即展示顺序 */
export const ITEM_CATEGORIES = ['材料', '工具', '装备', '食物', '设施', '作物'] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

const CATEGORY_MEMBERS: Record<ItemCategory, readonly ResourceKind[]> = {
  材料: [
    'branch', 'wood', 'stone', 'flint', 'ironOre', 'ironIngot',
    'fiber', 'rope', 'cloth', 'fur', 'arrow', 'bait', 'worm', 'torch', 'adventureBook',
  ],
  工具: ['axe', 'pickaxe', 'hoe', 'fishingrod', 'bow', 'sword'],
  装备: [
    'grassShirt', 'grassPants', 'strawHat', 'strawBackpack',
    'furShirt', 'furPants', 'furHat', 'furBackpack',
    'ironShirt', 'ironPants', 'ironHat', 'ironBackpack',
  ],
  食物: [
    'berry', 'cola', 'colaZero', 'bottle',
    'sardine', 'perch', 'shrimp', 'loach', 'puffer', 'cuttlefish',
    'anchovy', 'horseMackerel', 'yellowCroaker', 'saury', 'hairtail',
    'grouper', 'catfish', 'grassCarp', 'swordfish', 'manta', 'goldenFish',
    'crabMeat', 'birdMeat', 'gameMeat',
    'cookedBerry', 'cookedSmallFish', 'cookedBigFish', 'cookedGoldenFish',
    'cookedCrabMeat', 'cookedBirdMeat', 'cookedGameMeat',
  ],
  设施: [
    'reviveStone', 'poseidonBlessing', 'beehiveShrine', 'healCrystal',
    'rainAltar',
    'crate', 'ironCrate', 'baitBarrel', 'waterPurifier', 'smelter', 'loom',
    'fenceWood', 'fenceStone', 'fenceGate',
    'bed1', 'bed2', 'bed3',
    'workbench1', 'workbench2', 'workbench3', 'workbench4',
  ],
  作物: [
    'oakSeed', 'pineSeed', 'fruitSeed',
    'oakFruit', 'pineFruit', 'fruitFruit',
    'berryBush', 'shrubBush', 'grassTuft',
  ],
};

const CATEGORY_BY_KIND = new Map<ResourceKind, ItemCategory>(
  ITEM_CATEGORIES.flatMap((category) =>
    CATEGORY_MEMBERS[category].map((kind) => [kind, category] as const)
  )
);

let sortSeq = 0;
const SORT_INDEX = new Map<ResourceKind, number>(
  ITEM_CATEGORIES.flatMap((category) =>
    CATEGORY_MEMBERS[category].map((kind) => [kind, sortSeq++] as const)
  )
);

/** 背包整理排序序号:按分类与登记顺序,未登记的道具排在最后 */
export function itemSortIndex(kind: ResourceKind): number {
  return SORT_INDEX.get(kind) ?? Number.MAX_SAFE_INTEGER;
}

/** 查询物品所属分类;新物品未登记时归入「材料」并保持可发放 */
export function itemCategory(kind: ResourceKind): ItemCategory {
  return CATEGORY_BY_KIND.get(kind) ?? '材料';
}

export const ITEMS: Record<ResourceKind, ItemDef> = {
  branch: {
    kind: 'branch',
    name: '树枝',
    icon: '🪾',
    description: '细而易燃的枝条,是制作工具的基础材料,也可以当火堆的柴。',
    burnTime: 20,
  },
  wood: {
    kind: 'wood',
    name: '木头',
    icon: '🪵',
    description: '粗壮的木段,耐烧的好柴火。',
    burnTime: 45,
  },
  stone: {
    kind: 'stone',
    name: '石头',
    icon: '🪨',
    description: '沉甸甸的普通石块,制作工具和工作台的常用材料。',
  },
  flint: {
    kind: 'flint',
    name: '燧石',
    icon: '⚡',
    description: '尖锐的石片,与木头摩擦就能迸出火星。',
  },
  ironOre: {
    kind: 'ironOre',
    name: '铁矿石',
    icon: '💎',
    description: '沉甸甸的含铁矿石,断口处隐约透着金属光泽。',
  },
  ironIngot: {
    kind: 'ironIngot',
    name: '铁锭',
    icon: '⚙️',
    description: '炼得规规矩矩的铁块,坚硬可靠,是高级制作的核心材料。',
  },
  berry: {
    kind: 'berry',
    name: '浆果',
    icon: '🍒',
    description: '灌木丛中采摘的野果,酸酸甜甜。',
  },
  fiber: {
    kind: 'fiber',
    name: '植物纤维',
    icon: '🌾',
    description: '坚韧的植物纤维,可以搓成绳线。',
  },
  rope: {
    kind: 'rope',
    name: '绳线',
    icon: '🧵',
    description: '用植物纤维搓成的细绳,结实有韧性。',
  },
  cloth: {
    kind: 'cloth',
    name: '布料',
    icon: '🧶',
    description: '纺织机上一梭一梭织出来的整幅布,柔软又透气,也能投进火堆当柴。',
    burnTime: 35,
  },
  cola: {
    kind: 'cola',
    name: '可乐',
    icon: '🥤',
    description: '海里钓上来的易拉罐,居然没漏气!',
  },
  colaZero: {
    kind: 'colaZero',
    name: '无糖可乐',
    icon: '🥤',
    description: '无糖版本,喝了个寂寞但至少不渴了。',
  },
  bottle: {
    kind: 'bottle',
    name: '漂流瓶',
    icon: '🍾',
    description: '随波逐流的玻璃瓶,瓶塞里还塞着一张字条。',
  },
  sardine: {
    kind: 'sardine',
    name: '沙丁鱼',
    icon: '🐟',
    description: '银光闪闪的小鱼,量大街货。',
  },
  perch: {
    kind: 'perch',
    name: '鲈鱼',
    icon: '🐠',
    description: '常见的食用鱼,肉质鲜美。',
  },
  shrimp: {
    kind: 'shrimp',
    name: '虾',
    icon: '🦐',
    description: '活蹦乱跳的小虾,壳薄肉弹。',
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
  anchovy: {
    kind: 'anchovy',
    name: '鳀鱼',
    icon: '🐟',
    description: '成群结队的小银鱼,一口一条的海中零嘴。',
  },
  horseMackerel: {
    kind: 'horseMackerel',
    name: '竹荚鱼',
    icon: '🐠',
    description: '青背银腹的近海小鱼,肉质紧实。',
  },
  yellowCroaker: {
    kind: 'yellowCroaker',
    name: '小黄鱼',
    icon: '🐠',
    description: '通体姜黄的小鱼,海里捞到的黄金小炮弹。',
  },
  saury: {
    kind: 'saury',
    name: '秋刀鱼',
    icon: '🐟',
    description: '身形细长的秋刀鱼,烤着吃最香。',
  },
  hairtail: {
    kind: 'hairtail',
    name: '带鱼',
    icon: '🐟',
    description: '银亮如刀的带鱼,牙齿锋利,别被咬到。',
  },
  grouper: {
    kind: 'grouper',
    name: '石斑鱼',
    icon: '🐠',
    description: '体型敦实的大鱼,花纹斑驳,极其滋补。',
  },
  catfish: {
    kind: 'catfish',
    name: '巨鲶',
    icon: '🐡',
    description: '水洼深处的庞然大物,浑身滑腻,力气大得吓人。',
  },
  grassCarp: {
    kind: 'grassCarp',
    name: '草鱼',
    icon: '🐠',
    description: '水洼里养得膘肥体壮的大草鱼,一顿吃不完。',
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
    description: '通体金光闪闪的传说之鱼!',
  },
  reviveStone: {
    kind: 'reviveStone',
    name: '复活石',
    icon: '💠',
    description: '钓鱼钓起的传说之石,一直散发着淡淡的微光。',
  },
  poseidonBlessing: {
    kind: 'poseidonBlessing',
    name: '波塞冬的祝福',
    icon: '🔱',
    description:
      '海神赐福的三叉戟石像。放置期间全岛所有人钓鱼钓到杂物的概率降低 1%。',
  },
  beehiveShrine: {
    kind: 'beehiveShrine',
    name: '蜂巢神龛',
    icon: '🍯',
    description:
      '浸满蜂蜜的神龛。放置期间全岛所有人采集浆果丛时有 10% 概率多掉 1 颗浆果。',
  },
  healCrystal: {
    kind: 'healCrystal',
    name: '治愈水晶',
    icon: '💗',
    description:
      '散发着暖光的粉晶。放置期间 30 米内的所有玩家每 10 秒回复 1 点生命。',
  },
  rainAltar: {
    kind: 'rainAltar',
    name: '雨神祭坛',
    icon: '🌧️',
    description:
      '供奉雨神的蓝陶钵。放置期间 30 米内的所有玩家口渴值不再下降。',
  },
  torch: {
    kind: 'torch',
    name: '火把',
    icon: '🕯️',
    description: '树枝缠布做成的火把,暖暖的火光永不熄灭。',
  },
  crabMeat: {
    kind: 'crabMeat',
    name: '蟹肉',
    icon: '🦀',
    description: '剥出来的蟹肉,鲜甜弹牙。',
  },
  birdMeat: {
    kind: 'birdMeat',
    name: '鸟肉',
    icon: '🐦',
    description: '小块的鸟肉,烤熟了会更香。',
  },
  gameMeat: {
    kind: 'gameMeat',
    name: '兽肉',
    icon: '🥩',
    description: '猎捕野兽得来的大块兽肉,硬菜的好料。',
  },
  fur: {
    kind: 'fur',
    name: '皮毛',
    icon: '🐾',
    description: '猎捕野兽剥下的皮毛,御寒耐磨,烧起来也顶一阵子。',
    burnTime: 30,
  },
  cookedBerry: {
    kind: 'cookedBerry',
    name: '烤浆果',
    icon: '🍬',
    description: '火堆上烤过的浆果,糖分焦香。',
  },
  cookedSmallFish: {
    kind: 'cookedSmallFish',
    name: '烤小鱼',
    icon: '🍢',
    description: '烤得滋滋作响的小鱼,香气扑鼻。',
  },
  cookedBigFish: {
    kind: 'cookedBigFish',
    name: '烤大鱼',
    icon: '🍡',
    description: '烤熟的大鱼,外焦里嫩。',
  },
  cookedGoldenFish: {
    kind: 'cookedGoldenFish',
    name: '烤黄金鱼',
    icon: '🌟',
    description: '烤得金光四溢的传说之鱼。',
  },
  cookedCrabMeat: {
    kind: 'cookedCrabMeat',
    name: '烤蟹肉',
    icon: '🍤',
    description: '烤得通红的蟹肉,鲜甜弹牙。',
  },
  cookedBirdMeat: {
    kind: 'cookedBirdMeat',
    name: '烤鸟肉',
    icon: '🍗',
    description: '外焦里嫩的烤鸟肉。',
  },
  cookedGameMeat: {
    kind: 'cookedGameMeat',
    name: '烤兽肉',
    icon: '🍖',
    description: '烤得焦香的大块兽肉,荒岛盛宴的主菜。',
  },
  arrow: {
    kind: 'arrow',
    name: '箭',
    icon: '🏹',
    description: '用木头削成的箭,箭羽还削得挺工整。',
  },
  bait: {
    kind: 'bait',
    name: '鱼饵',
    icon: '🧆',
    description: '发酵好的小鱼饵,散发着鱼儿无法抗拒的香气。',
  },
  worm: {
    kind: 'worm',
    name: '蚯蚓',
    icon: '🪱',
    description: '水边湿土里钻出来的蚯蚓,是鱼儿最爱的天然饵。',
  },
  oakSeed: {
    kind: 'oakSeed',
    name: '橡树种子',
    icon: '🌰',
    description: '饱满的橡树种子,蕴着一棵大树的势头。',
  },
  pineSeed: {
    kind: 'pineSeed',
    name: '松树种子',
    icon: '🌱',
    description: '带着松脂清香的种子,落到土里就能扎根。',
  },
  fruitSeed: {
    kind: 'fruitSeed',
    name: '果树种子',
    icon: '🍏',
    description: '果核变成的种子,未来可期。',
  },
  oakFruit: {
    kind: 'oakFruit',
    name: '橡果',
    icon: '🌰',
    description: '圆滚滚的小橡果,透着股秋天的味道。',
  },
  pineFruit: {
    kind: 'pineFruit',
    name: '松果',
    icon: '🌲',
    description: '鳞瓣张开的松果,满身松脂香。',
  },
  fruitFruit: {
    kind: 'fruitFruit',
    name: '红果',
    icon: '🍎',
    description: '红彤彤的果子,看着就多汁。',
  },
  axe: {
    kind: 'axe',
    name: '木斧',
    icon: '🪓',
    description: '石头绑上树枝柄的简易斧头。',
  },
  pickaxe: {
    kind: 'pickaxe',
    name: '木镐',
    icon: '⛏️',
    description: '木头和石头拼出来的简易镐子。',
  },
  hoe: {
    kind: 'hoe',
    name: '木锄',
    icon: '⚒️',
    description: '磨得锋利的锄头,刨土翻地在行。',
  },
  fishingrod: {
    kind: 'fishingrod',
    name: '树枝鱼竿',
    icon: '🎣',
    description: '细枝绑上绳线做成的鱼竿,颇有原始风味。',
  },
  bow: {
    kind: 'bow',
    name: '树枝弓',
    icon: '🏹',
    description: '枝干弯成弓身、绳线做弦的简易弓。',
  },
  sword: {
    kind: 'sword',
    name: '木剑',
    icon: '🗡️',
    description: '两段木头削成的近战武器,胜在趁手。',
  },
  grassShirt: {
    kind: 'grassShirt',
    name: '草衣',
    icon: '🌿',
    description: '草茎木片捆成的简易上衣,减伤 16%,防御 +1。',
  },
  grassPants: {
    kind: 'grassPants',
    name: '草裤',
    icon: '🍁',
    description: '草叶围成的遮羞短裤,减伤 14%,防御 +1。',
  },
  strawHat: {
    kind: 'strawHat',
    name: '草帽',
    icon: '👒',
    description: '干草编的宽檐帽,减伤 10%,口渴速度 -5%。',
  },
  strawBackpack: {
    kind: 'strawBackpack',
    name: '草包',
    icon: '🎒',
    description: '草绳编的背包,背包 13 格。',
  },
  furShirt: {
    kind: 'furShirt',
    name: '皮衣',
    icon: '👕',
    description: '兽皮缝制的厚实上衣,减伤 24%,防御 +3。',
  },
  furPants: {
    kind: 'furPants',
    name: '皮裤',
    icon: '👖',
    description: '兽皮裹腿的长裤,减伤 20%,防御 +2。',
  },
  furHat: {
    kind: 'furHat',
    name: '皮帽',
    icon: '🎩',
    description: '皮毛缝的圆帽,减伤 16%,防御 +1,口渴速度 -5%。',
  },
  furBackpack: {
    kind: 'furBackpack',
    name: '皮包',
    icon: '🧺',
    description: '皮料缝制的大背囊,背包 16 格。',
  },
  ironShirt: {
    kind: 'ironShirt',
    name: '铁甲',
    icon: '🦺',
    description: '铁锭锻打的胸甲,减伤 30%,防御 +5。',
  },
  ironPants: {
    kind: 'ironPants',
    name: '铁裤',
    icon: '🩳',
    description: '铁片拼成的护腿,减伤 26%,防御 +4。',
  },
  ironHat: {
    kind: 'ironHat',
    name: '铁帽',
    icon: '⛑️',
    description: '铁盔护住头,减伤 19%,防御 +2,口渴速度 -5%。',
  },
  ironBackpack: {
    kind: 'ironBackpack',
    name: '铁包',
    icon: '🧳',
    description: '铁框大背包,背包 20 格。',
  },
  crate: {
    kind: 'crate',
    name: '木箱',
    icon: '📦',
    description: '木板钉成的收纳箱,能存 10 格物品。',
  },
  ironCrate: {
    kind: 'ironCrate',
    name: '铁箱',
    icon: '🧰',
    description: '铁皮包边的加固收纳箱,能存 20 格物品。',
  },
  baitBarrel: {
    kind: 'baitBarrel',
    name: '饵料桶',
    icon: '🪣',
    description: '木板箍成的发酵桶,能把食物慢慢酿成鱼饵。',
  },
  waterPurifier: {
    kind: 'waterPurifier',
    name: '海水净化器',
    icon: '🚰',
    description: '立在湿沙滩上的铁皮净水器,靠近就能喝上干净的清水。',
  },
  smelter: {
    kind: 'smelter',
    name: '冶炼炉',
    icon: '🏭',
    description: '石块垒成的冶炼炉,能把铁矿石炼成铁锭。',
  },
  loom: {
    kind: 'loom',
    name: '纺织机',
    icon: '🪡',
    description: '木架绷线的纺织机,能把绳线织成布料。',
  },
  fenceWood: {
    kind: 'fenceWood',
    name: '木围栏',
    icon: '🚧',
    description: '木栅栏段,相邻的围栏会自动连成整片。',
  },
  fenceStone: {
    kind: 'fenceStone',
    name: '石围栏',
    icon: '🧱',
    description: '石块垒的围栏段,比木围栏更结实气派。',
  },
  fenceGate: {
    kind: 'fenceGate',
    name: '围栏门',
    icon: '🚪',
    description: '两格宽的双扇栅栏门,动物可开不了门。',
  },
  bed1: {
    kind: 'bed1',
    name: '床',
    icon: '🛏️',
    description: '木框稻草垫拼成的床,睡一觉缓缓精神。',
  },
  bed2: {
    kind: 'bed2',
    name: '二级床',
    icon: '🛏️',
    description: '加高木框垫上柔软皮毛的舒服床,睡得更解乏。',
  },
  bed3: {
    kind: 'bed3',
    name: '三级床',
    icon: '🛏️',
    description: '铺着整幅软布的四柱皮毛大床,睡得又香又沉。',
  },
  berryBush: {
    kind: 'berryBush',
    name: '浆果丛',
    icon: '🍓',
    description: '连根带土的完整浆果丛,叶片间还挂着几点红。',
  },
  shrubBush: {
    kind: 'shrubBush',
    name: '灌木丛',
    icon: '🌳',
    description: '连根带土的完整灌木丛,枝叶蔫蔫地垂着。',
  },
  grassTuft: {
    kind: 'grassTuft',
    name: '草丛',
    icon: '🌱',
    description: '连根带土的完整草丛,根上还沾着湿润的泥。',
  },
  workbench1: {
    kind: 'workbench1',
    name: '一级工作台',
    icon: '🛠️',
    description: '结构简单的工作台,能制作基础物品。',
  },
  workbench2: {
    kind: 'workbench2',
    name: '二级工作台',
    icon: '🛠️',
    description: '加固过的工作台,能制作二级工具等高级配方。',
  },
  workbench3: {
    kind: 'workbench3',
    name: '三级工作台',
    icon: '🛠️',
    description: '精工打造的三级工作台。',
  },
  workbench4: {
    kind: 'workbench4',
    name: '四级工作台',
    icon: '🛠️',
    description: '满级工作台,岛上工坊的巅峰之作。',
  },
  adventureBook: {
    kind: 'adventureBook',
    name: '冒险家的经验书',
    icon: '📕',
    description: '不知哪位冒险家遗落的笔记,字里行间全是干货。',
  },
};
