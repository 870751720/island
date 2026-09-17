import type { PlayerSession } from '../mp/PlayerSession';
import { RECIPES, countsWithEquipped, workbenchUpgradeCost, type CraftId } from '../systems/Crafting';
import { countsFromSlots, type ResourceKind } from '../systems/Inventory';
import { ITEMS } from '../systems/Items';
import { QUESTS, type QuestView, type QuestRequirement, type QuestGuide } from './QuestDefinitions';

/** 将当前任务拆成可执行的下一步；先补原料/前置配方，再前往制作站。 */
export function resolveQuestObjective(s: PlayerSession, active: number, rows: QuestView['rows'], furDropped: boolean, campfires: number, fireLit: boolean): Pick<QuestView, 'recipes' | 'guide' | 'hint'> {
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
    } else hint = `材料已齐，停下后点击弹出的“制作${r.name}”卡片。`;
  };
  if (quest) {
    const unmet = quest.requirements.filter((_, i) => rows[i].have < rows[i].need);
    const req = unmet[0];
    if (req?.type === 'drink') { guide = { type: 'drink' }; }
    else if (req?.type === 'transplant') {
      if (!s.tools.shovel && (req.action === 'dig' || !counts.berryBush)) resolveRecipe('shovel');
      else if (req.action === 'dig' || !counts.berryBush) {
        guide = { type: 'transplant', action: 'dig' };
        hint = '切换到铲子，靠近高亮浆果丛站定挖掘；背包留一个空位。';
      } else if (!campfires) {
        if (counts.campfire || counts.deadCampfire) hint = '先在背包中使用火堆，找空地站定放下，熄灭的火堆也可以。';
        else resolveRecipe('campfire');
      } else {
        guide = { type: 'transplant', action: 'place' };
        hint = '到火堆附近空地，在背包中使用浆果丛，绿影距火堆6米内站定放下。';
      }
    }
    else if (req?.type === 'gather') guide = { type: 'resource', kinds: unmet.filter((r): r is Extract<QuestRequirement, { type: 'gather' }> => r.type === 'gather').map(r => r.kind) };
    else if (req?.type === 'craft') {
      // 多件任务优先引导已可制作的配方，避免已有材料却被固定顺序卡住。
      const crafting = unmet.filter((r): r is Extract<QuestRequirement, { type: 'craft' }> => r.type === 'craft');
      const affordable = crafting.find(req => { const r = RECIPES.find(r => r.id === req.id)!; return Object.entries(r.cost).every(([k, n]) => (counts[k as ResourceKind] ?? 0) >= n); });
      resolveRecipe((affordable ?? req).id);
      for (const item of crafting) if (!recipes.includes(item.id)) recipes.push(item.id);
    } else if (req?.type === 'camp') {
      if (req.action === 'place' || !campfires) {
        if (counts.campfire || counts.deadCampfire) hint = '在背包中使用火堆，找空地站定放下。';
        else resolveRecipe('campfire');
      } else {
        const action = req.action === 'cook' && fireLit ? 'cook' : 'fuel';
        const fuel = Object.entries(counts).some(([k, n]) => n > 0 && ITEMS[k as ResourceKind].burnTime);
        if (action === 'fuel' && !fuel) { guide = { type: 'resource', kinds: ['wood', 'branch'] }; hint = '先收集木头或树枝，给火堆添柴。'; }
        else if (action === 'cook' && !counts.gameMeat) { guide = { type: 'resource', kinds: ['gameMeat'] }; hint = '腾出空间领取奖励兽肉；若已经吃掉，寻找羊获取兽肉。'; }
        else { guide = { type: 'campfire', action, ready: true }; hint = action === 'fuel' ? '靠近高亮火堆，打开面板，点击木头或树枝添柴。' : quest.hint; }
      }
    } else if (req?.type === 'bench') {
      if (req.level === 1) {
        if (['workbench1', 'workbench2', 'workbench3', 'workbench4'].some(kind => (counts[kind as ResourceKind] ?? 0) > 0)) hint = '在背包中使用工作台，找空地站定放下。';
        else resolveRecipe('workbench');
      } else {
        const cost = workbenchUpgradeCost(1);
        const ready = Object.entries(cost).every(([k, n]) => (counts[k as ResourceKind] ?? 0) >= (n ?? 0));
        guide = ready ? { type: 'bench', level: 1, ready } : { type: 'resource', kinds: ['fur'] };
        hint = ready ? '皮毛已齐，打开工作台面板，升级到二级。' : '寻找羊，拾取皮毛；升级工作台需要4张。';
      }
    }
  }
  if (guide?.type === 'resource' && (guide.kinds.includes('fur') || guide.kinds.includes('gameMeat')) && !furDropped) {
    if (!s.tools.sword) {
      resolveRecipe('sword');
      hint = `先准备木剑。${hint}`;
    }
  }
  if (guide?.type === 'resource' && guide.kinds.includes('wood') && !s.tools.axe) {
    resolveRecipe('axe');
    hint = `采集木头需要斧子。${hint}`;
  }
  return { recipes, guide, hint };
}
