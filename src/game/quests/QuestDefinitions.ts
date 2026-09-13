import type { CraftId } from '../systems/Crafting';
import type { ResourceKind } from '../systems/Inventory';

export type QuestRequirement =
  | { type: 'gather'; kind: ResourceKind; count: number }
  | { type: 'craft'; id: CraftId; count: number }
  | { type: 'bench'; level: number }
  | { type: 'camp'; action: 'place' | 'fuel' | 'cook' };
export type QuestDefinition = {
  id: string; title: string; hint: string;
  requirements: QuestRequirement[];
  reward: Partial<Record<ResourceKind, number>>;
};
const gather = (kind: ResourceKind, count: number): QuestRequirement => ({ type: 'gather', kind, count });
const craft = (id: CraftId, count = 1): QuestRequirement => ({ type: 'craft', id, count });
export const QUESTS: readonly QuestDefinition[] = [
  { id: 'supplies', title: '捡起第一份物资', hint: '靠近灌木丛和碎石堆，停下即可采集。', requirements: [gather('branch', 2), gather('stone', 2)], reward: { berry: 3 } },
  { id: 'tools', title: '制作采集工具', hint: '打开背包的制作页，制作木斧和木镐。', requirements: [craft('axe'), craft('pickaxe')], reward: { fiber: 2 } },
  { id: 'materials', title: '收集营地材料', hint: '拿斧砍树获得木头，采集草丛获得纤维。', requirements: [gather('wood', 4), gather('fiber', 6)], reward: { branch: 2, stone: 2 } },
  { id: 'bench', title: '建立工作台', hint: '制作工作台后，拿在手上，找空地站定放下。', requirements: [{ type: 'bench', level: 1 }], reward: { fiber: 3 } },
  { id: 'bag', title: '先把背包装大', hint: '制作草包，增加背包容量。', requirements: [craft('strawBackpack')], reward: { fiber: 2 } },
  { id: 'outfit', title: '穿好再出发', hint: '做齐草衣、草裤和草帽，保护自己。', requirements: [craft('grassShirt'), craft('grassPants'), craft('strawHat')], reward: { berry: 3 } },
  { id: 'rope', title: '学会搓绳', hint: '靠近工作台，点击右侧工作台按钮制作绳线。', requirements: [craft('rope', 2)], reward: { rope: 1 } },
  { id: 'sword', title: '准备狩猎', hint: '在工作台制作木剑，持剑靠近羊攻击。', requirements: [craft('sword')], reward: { wood: 2 } },
  { id: 'fur', title: '收获第一张皮毛', hint: '寻找羊，持木剑靠近攻击，再拾取皮毛。', requirements: [gather('fur', 2)], reward: { fur: 2, gameMeat: 2 } },
  { id: 'campfire', title: '升起营火', hint: '制作火堆，在背包中使用，找空地站定放下。', requirements: [{ type: 'camp', action: 'place' }], reward: { wood: 2 } },
  { id: 'fuel', title: '给火堆添柴', hint: '打开火堆面板，添加一次木头或其他燃料。', requirements: [{ type: 'camp', action: 'fuel' }], reward: { gameMeat: 1 } },
  { id: 'cook', title: '烤一份兽肉', hint: '在燃烧的火堆旁选择奖励的兽肉，点击烤并站定等烤熟。', requirements: [{ type: 'camp', action: 'cook' }], reward: { berry: 3 } },
  { id: 'upgrade', title: '升级营地', hint: '带上4张皮毛，在工作台面板升级到二级。', requirements: [{ type: 'bench', level: 2 }], reward: { rope: 2 } },
  { id: 'stone-sword', title: '换上石剑', hint: '在二级工作台制作石剑，提高近战伤害。', requirements: [craft('refined-sword')], reward: { stone: 2 } },
  { id: 'hat', title: '第一件皮装备', hint: '在二级工作台制作皮帽，身上的草帽也能作为材料。', requirements: [craft('furHat')], reward: { fur: 1 } },
  { id: 'leather', title: '换上探险装', hint: '在二级工作台制作皮衣和皮裤。', requirements: [craft('furShirt'), craft('furPants')], reward: { rope: 2 } },
  { id: 'graduate', title: '整装出发', hint: '制作皮包，做齐皮制四件套，开启自由探索。', requirements: [craft('furBackpack'), craft('furHat'), craft('furShirt'), craft('furPants'), { type: 'bench', level: 2 }], reward: { berry: 5, wood: 3 } },
];
export const GATHER_KINDS = ['branch', 'stone', 'wood', 'fiber', 'fur', 'flint', 'gameMeat'] as const;
export type QuestGuide = { type: 'resource'; kinds: ResourceKind[] } | { type: 'bench'; level: number; ready: boolean } | { type: 'campfire'; action: 'fuel' | 'cook'; ready: boolean } | null;
export type QuestView = {
  enabled: boolean; active: number; finished: boolean; celebration: boolean;
  rows: { label: string; have: number; need: number }[];
  done: string[]; recipes: CraftId[]; guide: QuestGuide; hint: string; activity: number; busy: boolean;
  pending: boolean;
  navigationHint?: string | null;
};
export type QuestSave = {
  completed?: boolean;
  camp?: Partial<Record<'place' | 'fuel' | 'cook', number>>;
  gathered: Partial<Record<ResourceKind, number>>;
  crafted: Partial<Record<CraftId, number>>;
  done: string[]; paid: string[]; benchLevel: number;
  pending: Partial<Record<ResourceKind, number>>;
};
