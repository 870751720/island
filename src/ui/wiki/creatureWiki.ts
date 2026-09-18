import { ANIMAL_LABELS, RARE_LOOT, SPECIES, type AnimalSpecies } from '@/game/entities/Wildlife';
import { canLasso, isLassoPredator } from '@/game/entities/LassoRules';
import { HEART_MAX, LIVESTOCK_PRODUCE, PRODUCTION_SECONDS, type TameSpecies } from '@/game/systems/AnimalHusbandry';
import { FOODS, type FoodEater } from '@/game/systems/Food';
import { CAT_FINDS, COMPANIONS } from '@/game/companions/CompanionDefinition';
import type { ResourceKind } from '@/game/systems/Inventory';
import { rareLootNote } from './itemSources';
import type { WikiTextValue } from './WikiText';

export type CreatureId = AnimalSpecies | 'dog' | 'cat' | 'bird' | 'crab' | 'seaPredator';
type RelatedItem = { kind: ResourceKind; count?: number; note?: string };
export type CreatureEntry = {
  id: CreatureId;
  name: string;
  tags: readonly string[];
  description: WikiTextValue;
  habitat: WikiTextValue;
  behavior: WikiTextValue;
  interaction: WikiTextValue;
  stats: { label: string; shortLabel: string; value: string }[];
  foods: RelatedItem[];
  drops: RelatedItem[];
  dropNote?: string;
  produce: RelatedItem[];
  productionNote?: WikiTextValue;
};

type WildlifeGuide = Pick<CreatureEntry, 'tags' | 'description' | 'habitat' | 'behavior'>;
const WILDLIFE_GUIDES: Record<AnimalSpecies, WildlifeGuide> = {
  rabbit: {
    tags: ['胆小', '可驯养'], description: '轻巧机灵的草地居民，附近的兔子洞是它的避难所。', habitat: '岛屿南部至中部的草地与兔子洞附近。',
    behavior: ['靠近或攻击会让它逃跑，有洞可躲时优先钻洞。藏在洞内时无法直接攻击；可以用', { kind: 'shovel', label: '铲子' }, '挖开洞口。'],
  },
  sheep: {
    tags: ['温顺', '可驯养'], description: ['胆小的食草动物，成年驯养后能提供', { kind: 'milk', label: '羊奶' }, '和', { kind: 'wool', label: '羊毛' }, '。'], habitat: '岛屿中南部草地。',
    behavior: '玩家靠近或受到攻击时会逃离。幼羊可以驯养，长大后才会产奶、产毛；驯养后不再繁殖。',
  },
  bison: {
    tags: ['护幼反击', '可驯养'], description: ['体格结实的草地动物，成年驯养后能提供', { kind: 'cowMilk', label: '牛奶' }, '。'], habitat: '岛屿中部至北部草地。',
    behavior: '平时会避开玩家，但成年野牛受击降至半血会被激怒，也会保护受攻击的幼崽。反击时要及时拉开距离。',
  },
  wolf: {
    tags: ['主动攻击', '可驯养'], description: '警觉的草地掠食者，会追赶进入警戒范围的玩家。', habitat: '岛屿中北部草地。',
    behavior: '发现玩家后主动追击、近身撕咬。探索时留出绕行空间，准备武器和护甲后再接战。',
  },
  bear: {
    tags: ['高危猛兽', '可驯养'], description: '北部草地的强大猛兽，生命力与攻击力都很高。', habitat: '岛屿北部草地。',
    behavior: '会冲刺追击和蓄力扑击，中箭后短暂暴怒。冲刺耗尽后需要喘息，可利用这段时间拉开距离；劳作和放箭的噪音也可能惊动它。',
  },
  crocodile: {
    tags: ['水边伏击', '不可驯养'], description: '潜伏在水洼里的危险掠食者，喝水时可能突然出现。', habitat: '内陆水洼及附近岸边。',
    behavior: '现身时会跃出扑咬，随后在水边追击。离开警戒范围后等待它平静，持续脱战会下潜离场；自然离场不掉战利品。',
  },
};

function foodsFor(eater: FoodEater): RelatedItem[] {
  return FOODS.filter((food) => food.hunger > 0 && food.eaters.includes(eater)).map((food) => ({ kind: food.kind }));
}

function wildlifeEntry(id: AnimalSpecies): CreatureEntry {
  const config = SPECIES[id];
  const tame = canLasso(id);
  const stats = [{ label: '基础生命', shortLabel: '生命', value: String(config.hp) }];
  if (config.damage > 0) stats.push({ label: '基础攻击伤害', shortLabel: '攻击', value: String(config.damage) });
  if (tame) stats.push({ label: '驯养所需爱心', shortLabel: '驯养', value: String(HEART_MAX[id as TameSpecies]) });
  const produceSpec = LIVESTOCK_PRODUCE[id as TameSpecies];
  const produce: RelatedItem[] = produceSpec
    ? [{ kind: produceSpec.milk, count: 1 }, ...(produceSpec.wool ? [{ kind: produceSpec.wool, count: 1 }] : [])]
    : [];
  return {
    id, name: ANIMAL_LABELS[id], ...WILDLIFE_GUIDES[id], stats,
    interaction: tame
      ? ['用', { kind: 'lasso', label: '套索' }, isLassoPredator(id) ? '抓住后，必须等待五次挣脱判定全部失败，才能开始投喂；驯养成功前仍会攻击。' : '抓住后即可开始投喂。', '主动丢下适合的食物，落地至少四秒后供它进食，也可从食料桶取食，实际爱心达到上限即可驯养（成功前填充最多显示九成）。驯养后全队共享，需持续供食；爱心归零会恢复野生。']
      : ['不能使用', { kind: 'lasso', label: '套索' }, '或驯养。可以用武器击杀，也可以远离水洼脱战。'],
    foods: tame ? foodsFor(id as TameSpecies) : [],
    drops: [
      ...config.loot,
      ...RARE_LOOT.filter((drop) => drop.species === id).map((drop) => ({ kind: drop.kind, count: drop.count, note: rareLootNote(drop) })),
    ],
    dropNote: '展示成年个体的基础掉落，幼崽、天气恩泽与传承加成可能影响实际产出。',
    produce,
    productionNote: produce.length ? [
      `成年且保持驯养时，每 ${PRODUCTION_SECONDS / 60} 分钟各准备一份，未领取不累计。靠近可自动挤奶`,
      ...(produceSpec?.wool ? ['；手持', { kind: 'shears' as const, label: '剪刀' }, '时改为剪毛；有完整羊毛的成年羊驯养成功即可剪，剪后十分钟重新长好'] : []),
      '。幼崽不生产。时间为默认速度下的游戏运行时间。',
    ] : undefined,
  };
}

const COMPANION_INTERACTION: WikiTextValue = ['新建岛屿时选择，本局固定，联机时全队共享。可以投喂适合的食物，也能从', { kind: 'feedBarrel', label: '食料桶' }, '进食；同行、投喂和完整回窝睡眠有助于成长。'];

/** 仅收录参与场景玩法的 11 种生物；蝴蝶与可钓获水产不列入本图鉴。 */
export const CREATURE_ENTRIES: readonly CreatureEntry[] = [
  ...(['rabbit', 'sheep', 'bison', 'wolf', 'bear', 'crocodile'] as const).map(wildlifeEntry),
  {
    id: 'dog', name: COMPANIONS.dog.name, tags: ['同行伙伴', '护主'], description: COMPANIONS.dog.description,
    habitat: ['跟随岛上玩家，也会回', { kind: 'doghouse', label: '宠物窝' }, '休息。'], behavior: '遇到威胁时扑咬护主，成长后获得更强的伙伴能力。',
    interaction: COMPANION_INTERACTION, stats: [], foods: foodsFor('dog'), drops: [], produce: [],
  },
  {
    id: 'cat', name: COMPANIONS.cat.name, tags: ['同行伙伴', '觅食'], description: COMPANIONS.cat.description,
    habitat: '跟随岛上玩家，在附近干地发掘食物。', behavior: '不攻击、不受伤，也不会死亡。附近有战斗时会避让，危险结束后恢复跟随和觅食。',
    interaction: COMPANION_INTERACTION, stats: [], foods: foodsFor('cat'), drops: [],
    produce: CAT_FINDS.map((find) => ({ kind: find.kind, note: `${find.stage} 阶段起可找到` })),
    productionNote: '每次成功发掘随机获得一份已解锁的食物，交给当前跟随的玩家；背包满时落在地面。成长会扩大发掘食物范围并缩短休息时间。',
  },
  {
    id: 'bird', name: '鸟', tags: ['会飞', '可狩猎'], description: '在岛上盘旋、滑翔，偶尔落地觅食的小鸟。',
    habitat: '岛屿上空与地面落脚处。', behavior: '靠近地面觅食的鸟会将它惊飞，之后重新回到空中巡航。',
    interaction: ['可以用', { kind: 'bow', label: '弓箭' }, '猎取，射落后获得', { kind: 'birdMeat', label: '鸟肉' }, '。不能使用', { kind: 'lasso', label: '套索' }, '或驯养。'], stats: [], foods: [], drops: [{ kind: 'birdMeat' }], produce: [],
  },
  {
    id: 'crab', name: '螃蟹', tags: ['沙滩出没', '胆小'], description: ['在沙滩上横着走的小生物，是', { kind: 'crabMeat', label: '蟹肉' }, '的来源之一。'],
    habitat: '沿岛分布的沙滩。', behavior: '玩家靠近时会横向逃离，不会主动攻击。',
    interaction: ['可以猎取获得', { kind: 'crabMeat', label: '蟹肉' }, '，不能使用', { kind: 'lasso', label: '套索' }, '或驯养。'], stats: [], foods: [], drops: [{ kind: 'crabMeat' }], produce: [],
  },
  {
    id: 'seaPredator', name: '海中巨影', tags: ['海中威胁', '无法猎杀'], description: '从深处浮现的掠食巨影，警告玩家不要在海里停留太久。',
    habitat: '海水游泳区域，水洼与浅滩不会触发。', behavior: '在海中持续游泳会先出现恐慌与察觉提示，随后巨影现身并反复咬击，伤害无视装备防御和减伤。',
    interaction: '尽快离开海水回到岸上，巨影会下潜离场，入海计时重置。无法通过攻击猎杀，也不能驯养或获取掉落。',
    stats: [], foods: [], drops: [], produce: [],
  },
];
