import type { PlayerSession } from '../mp/PlayerSession';
import { RECIPES, countsWithEquipped, workbenchUpgradeCost, type CraftId } from '../systems/Crafting';
import { countsFromSlots, type ResourceKind } from '../systems/Inventory';
import { ITEMS } from '../systems/Items';
import { QUESTS, type QuestView, type QuestRequirement, type QuestGuide } from './QuestDefinitions';

/** 将当前任务拆成可执行的下一步；先补原料/前置配方，再前往制作站。 */
export function resolveQuestObjective(s: PlayerSession, active: number, rows: QuestView['rows'], furDropped: boolean): Pick<QuestView, 'recipes' | 'guide' | 'hint'> {
  const quest = QUESTS[active];
  const counts = countsWithEquipped(countsFromSlots(s.inventory.snapshot()), s.equipment.snapshot());
  const recipes: CraftId[] = [];
  let guide: QuestGuide = null;
  let hint = quest?.hint ?? '皮制套装已备齐，去探索更远的海岛吧！';
  const resolveRecipe = (id: CraftId, depth = 0): void => {
    if (depth > 5) return;
    const r = RECIPES.find(r => r.id === id);
    if (!r) return;
    recipes.unshift(id);
    const missing = Object.entries(r.cost).filter(([k, n]) => (counts[k as ResourceKind] ?? 0) < n);
    if (missing.length) {
      const raw = missing.filter(([k]) => ['branch', 'stone', 'wood', 'fiber', 'fur', 'flint'].includes(k)).map(([k]) => k as ResourceKind);
      if (raw.length) { guide = { type: 'resource', kinds: raw }; hint = `还缺${raw.map(k => ITEMS[k].name).join('、')}。${raw.includes('fur') ? '寻找羊，狩猎后拾取皮毛。' : '前往高亮物资处采集。'}`; }
      else {
        const precursor = RECIPES.find(p => p.output === missing[0][0]);
        if (precursor) { resolveRecipe(precursor.id, depth + 1); hint = `先制作${precursor.name}，再完成当前装备。`; }
      }
    } else if (r.station === 'workbench') {
      guide = { type: 'bench', level: r.minBenchLevel ?? 1, ready: true };
      hint = `材料已齐，前往${r.minBenchLevel ?? 1}级或以上工作台制作${r.name}。`;
    } else hint = `材料已齐，打开背包制作${r.name}。`;
  };
  if (quest) {
    const unmet = quest.requirements.filter((_, i) => rows[i].have < rows[i].need);
    const req = unmet[0];
    if (req?.type === 'gather') guide = { type: 'resource', kinds: unmet.filter((r): r is Extract<QuestRequirement, { type: 'gather' }> => r.type === 'gather').map(r => r.kind) };
    else if (req?.type === 'craft') {
      // 多件任务优先引导已可制作的配方，避免已有材料却被固定顺序卡住。
      const crafting = unmet.filter((r): r is Extract<QuestRequirement, { type: 'craft' }> => r.type === 'craft');
      const affordable = crafting.find(req => { const r = RECIPES.find(r => r.id === req.id)!; return Object.entries(r.cost).every(([k, n]) => (counts[k as ResourceKind] ?? 0) >= n); });
      resolveRecipe((affordable ?? req).id);
      for (const item of crafting) if (!recipes.includes(item.id)) recipes.push(item.id);
    } else if (req?.type === 'bench') {
      if (req.level === 1) {
        if ((counts.workbench1 ?? 0) > 0) hint = '在背包中使用工作台，找空地站定放下。';
        else resolveRecipe('workbench');
      } else {
        const cost = workbenchUpgradeCost(1);
        const ready = Object.entries(cost).every(([k, n]) => (counts[k as ResourceKind] ?? 0) >= (n ?? 0));
        guide = ready ? { type: 'bench', level: 1, ready } : { type: 'resource', kinds: ['fur'] };
        hint = ready ? '皮毛已齐，打开工作台面板，升级到二级。' : '寻找羊，拾取皮毛；升级工作台需要4张。';
      }
    }
  }
  if (guide?.type === 'resource' && guide.kinds.includes('fur') && !furDropped) {
    if (!s.tools.bow) {
      resolveRecipe('bow');
      hint = `先准备树枝弓。${hint}`;
    } else if (s.ammo.count('arrow') === 0 && s.inventory.count('endlessQuiver') === 0) {
      resolveRecipe('arrow');
      hint = `箭用完了，先补充箭。${hint}`;
    }
  }
  if (guide?.type === 'resource' && guide.kinds.includes('wood') && !s.tools.axe) {
    resolveRecipe('axe');
    hint = `采集木头需要斧子。${hint}`;
  }
  return { recipes, guide, hint };
}
