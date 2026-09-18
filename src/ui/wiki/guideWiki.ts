import type { ResourceKind } from '@/game/systems/Inventory';
import type { CreatureId } from './creatureWiki';

export type GuideLink = { kind: ResourceKind; label: string } | { creature: CreatureId; label: string };
export type GuideText = readonly (string | GuideLink)[];
export type GuideEntry = {
  id: string;
  title: string;
  summary: string;
  sections: readonly { title: string; text: GuideText }[];
};
const item = (kind: ResourceKind, label: string): GuideLink => ({ kind, label });
const creature = (creature: CreatureId, label: string): GuideLink => ({ creature, label });

/** 显式关联图鉴 ID，避免把猫咪「可乐」误链到同名饮料。 */
export const GUIDE_ENTRIES: readonly GuideEntry[] = [
  {
    id: 'crafting', title: '采集与制作', summary: '从基础工具到工作台，建立制作路线。',
    sections: [
      { title: '准备工具', text: ['采集基础材料后制作', item('axe', '斧'), '和', item('pickaxe', '镐'), '，分别用于伐木和采矿。采集草丛得到的', item('fiber', '植物纤维'), '可以加工成', item('rope', '绳线'), '，用于更多工具与设施。'] },
      { title: '使用工作台', text: ['制作并放下', item('workbench1', '一级工作台'), '，靠近后点右侧工作台按钮，面板同时列出工作台配方与手搓配方，选择配方与份数。制作时保持站定，移动或离开范围会中断；升级工作台可解锁更多配方。'] },
      { title: '进阶加工', text: ['用', item('smelter', '冶炼炉'), '加工', item('ironOre', '铁矿石'), '获得', item('ironIngot', '铁锭'), '，用', item('loom', '纺织机'), '制作', item('cloth', '布料'), '。点击材料或设施名称，可以查看获得方式与所需工作台等级。'] },
    ],
  },
  {
    id: 'crops', title: '开垦与种植', summary: '开出耕地、播种，再把成熟作物收回家。',
    sections: [
      { title: '开垦与播种', text: ['手持', item('hoe', '锄'), '，在无障碍的干地调整到绿色预览并站定，自动开出土壤。再手持', item('carrotSeed', '胡萝卜种子'), '或其他作物种子，对准空土壤站定即可连续播种，每颗耗时 0.5 秒，播完一格紧接下一格，无需移动重触发；附近无空位或种子用完时停止。树种也可在合适的干地连续播种，移动会暂停播种。'] },
      { title: '成熟后采收', text: ['作物会从幼苗逐渐长到成熟。空手靠近成熟作物并站定即可采收，获得作物与对应种子，继续播种形成循环。', item('carrot', '胡萝卜'), '可以食用或烹饪；', item('wheat', '小麦'), '先在', item('mill', '磨坊'), '磨成', item('flour', '面粉'), '，再在火堆烤成', item('bread', '烤面包'), '。'] },
      { title: '清理与扩种', text: ['手持', item('shovel', '铲'), '会先铲除作物，且不返还产物，再挖才清除土壤；想收获时记得切回空手。不同种子的来源不同，可点开种子图鉴查看获得方式。'] },
    ],
  },
  {
    id: 'fishing', title: '钓鱼与制饵', summary: '准备鱼竿和鱼饵，探索淡水与海水的收获。',
    sections: [
      { title: '寻找钓点', text: ['制作', item('fishingrod', '鱼竿'), '后，站在岸上面朝水面，按钓鱼提示抛竿与收竿。内陆水洼与海水的鱼种不同，例如水洼可钓到', item('perch', '鲈鱼'), '，海水可钓到', item('sardine', '沙丁鱼'), '。'] },
      { title: '准备鱼饵', text: ['把', item('worm', '蚯蚓'), '或可用食材放入', item('baitBarrel', '饵料桶'), '，等待发酵后收取', item('bait', '鱼饵'), '。鱼饵独立计数，不占背包格；有饵抛竿会自动消耗，收获好东西的机会更高。'] },
      { title: '处理收获', text: ['鱼可以留作食物、烹饪或用于合适动物的投喂，具体用途可查物品详情。钓鱼还可能获得杂物、种子或珍宝；无需游进海里找鱼，长时间游泳会招来', creature('seaPredator', '海中巨影'), '。'] },
    ],
  },
  {
    id: 'cooking', title: '烹饪与饮水', summary: '烤制食物、煮汤，安排稳定的食物和水源。',
    sections: [
      { title: '烤制食物', text: ['放下', item('campfire', '火堆'), '，保持燃烧后选择食材和份数烤制。烤制时保持站定，走开会中断；留出背包空间收取熟食。'] },
      { title: '升级厨房', text: ['用', item('shovel', '铲'), '回收燃尽的火堆，得到', item('deadCampfire', '熄灭的火堆'), '，再按配方制作', item('cookingStation', '烹饪台'), '。它既能烤制，也能煮汤；下锅后自动加工，燃尽会暂停，添柴可继续，煮好后记得收取。'] },
      { title: '安排饮水', text: ['水洼可提供饮水，但要留意', creature('crocodile', '鳄鱼'), '。发展后可以在海边湿沙滩放置', item('waterPurifier', '海水净化器'), '，靠近站定饮水；也可以准备', item('boiledSmallFish', '鲜鱼汤'), '等补充水分的食物。'] },
    ],
  },
  {
    id: 'husbandry', title: '驯养与畜牧', summary: '套索捕捉、投喂驯养，持续照料动物。',
    sections: [
      { title: '捕捉与投喂', text: ['用', item('lasso', '套索'), '抓住', creature('rabbit', '兔子'), '、', creature('sheep', '羊'), '或', creature('bison', '野牛'), '后，主动丢下适合它吃的食物，等待它进食并填满爱心。首次驯养也可以把适配食物放进食料桶；点击生物名称可查看食谱。'] },
      { title: '持续照料', text: ['驯养阶段和成功后都可以用', item('feedBarrel', '食料桶'), '供食。成功后解绳可在中心半径30米内活动，优先吃自然植物，低于50%爱心才吃储粮。每只兔子配1个草丛、羊配2个、野牛配3个，在可到达且无人采集或争食时可长期自给。爱心会逐渐减少，归零后恢复野生；', creature('wolf', '狼'), '和', creature('bear', '熊'), '会重新具有攻击性；狼熊满心无食物可维持60分钟，日常鱼肉恢复量提高。这两种猛兽首次捕捉还需等待挣脱判定结束，驯养成功前仍然危险。'] },
      { title: '领取产物', text: ['成年驯养羊与野牛可产奶，靠近站定自动挤奶。羊还会长出', item('wool', '羊毛'), '，手持', item('shears', '剪刀'), '靠近即可剪毛；有完整羊毛的成年羊驯养成功就能剪，剪后十分钟重新长好。幼崽需要长大后才生产，已备好的产物未领取不会继续累积。'] },
    ],
  },
  {
    id: 'companions', title: '同行伙伴', summary: '了解伙伴的分工，通过陪伴和照料帮助它成长。',
    sections: [
      { title: '选择伙伴', text: ['创建新岛时选择', creature('dog', '薯条'), '或', creature('cat', '可乐'), '，本局固定。薯条会护主，可乐会寻找食物并避开战斗；联机时全队共享岛上的伙伴。'] },
      { title: '喂食与成长', text: ['主动丢下伙伴能吃的食物，等待它进食，也可以把适合的食物放入', item('feedBarrel', '食料桶'), '。同行、投喂和完整回窝睡眠有助成长；各自能吃什么可在生物详情查看。'] },
      { title: '安置住处', text: ['制作并放置', item('doghouse', '宠物窝'), '，给伙伴提供休息的地方。可乐成长后能发现更多种类的食物，薯条成长后拥有更强的护主能力。'] },
    ],
  },
  {
    id: 'brewing', title: '酿酒与使用', summary: '把富余食材酿成酒，根据需要安排饮用。',
    sections: [
      { title: '投料与收取', text: ['制作', item('brewBarrel', '酿酒桶'), '，投入', item('berry', '浆果'), '、', item('fruitFruit', '苹果'), '或其他可酿原料，等待酿好后收取。一个桶同一时间只处理同种原料，换原料前先清空剩余原料和成品。'] },
      { title: '留意饮用状态', text: [item('wineBerry', '浆果酒'), '等酒类除了恢复数值，还能带来舒爽状态。舒爽时再次喝酒会转为晕晕的，移动变慢但剑与弓的伤害提高；再次饮酒还会切换状态，出发前按需要安排。'] },
    ],
  },
  {
    id: 'camp', title: '营地与收纳', summary: '摆放设施、整理库存，需要时回收搬家。',
    sections: [
      { title: '安放设施', text: ['从背包使用设施或从手持选择面板选中，在绿色预览处站定安放。给工作台、生产设施和通行路线留出空间；', item('waterPurifier', '海水净化器'), '等设施有特定地形要求。'] },
      { title: '动物禁刷', text: ['岛上每座工作台周围 45 米内不会补刷兔、羊、野牛、狼和熊，夜袭生成也避开这一区域；篝火不提供禁刷圈。已有动物仍可能走进营地。普通补刷连续两次重试失败后，会尝试更换空缺名额的栖息地。'] },
      { title: '整理与回收', text: ['把暂时不用的物资存入', item('crate', '木箱'), '，为外出采集腾出背包格。需要调整营地时，用', item('shovel', '铲'), '回收支持挖回的设施；具体条件查看对应物品的「回收方式」。'] },
      { title: '联机分工', text: ['可以分工采集、种植和加工，共用岛上的设施。制作时先把需要的材料取到自己的背包；查看指南与图鉴不会替队友操作，联机阅读也不会暂停整个岛屿。'] },
    ],
  },
];

export function guideSearchText(entry: GuideEntry): string {
  return [entry.title, entry.summary, ...entry.sections.flatMap((section) => [section.title, ...section.text.map((part) => typeof part === 'string' ? part : part.label)])].join(' ');
}
