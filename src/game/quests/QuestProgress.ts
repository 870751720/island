import { resolveQuestObjective } from './QuestObjective';
import type { PlayerSession } from '../mp/PlayerSession';
import { RECIPES, type CraftId } from '../systems/Crafting';
import { type ResourceKind } from '../systems/Inventory';
import { EQUIPMENT, isEquipKind } from '../systems/Equipment';
import { ITEMS } from '../systems/Items';
import { GATHER_KINDS, QUESTS, type QuestSave, type QuestView, type QuestRequirement } from './QuestDefinitions';

/** 每位玩家独立持有；只有单机/房主推进与发奖，客人读取 HUD 镜像。 */
export class QuestProgress {
  enabled = true;
  private state: QuestSave = { gathered: {}, crafted: {}, done: [], paid: [], benchLevel: 0, pending: {} };
  private legacy = false;
  private celebrate = 0;
  view: QuestView | null = null;

  restore(save?: QuestSave): void {
    this.legacy = !save;
    if (save) this.state = structuredClone(save);
    this.celebrate = 0;
  }
  snapshot(): QuestSave { return structuredClone(this.state); }
  collected(kind: ResourceKind, count: number): void {
    if (count <= 0 || !GATHER_KINDS.some(k => k === kind)) return;
    this.state.gathered[kind] = (this.state.gathered[kind] ?? 0) + count;
  }
  crafted(id: CraftId): void {
    this.state.crafted[id] = (this.state.crafted[id] ?? 0) + 1;
  }
  private craftCount(s: PlayerSession, id: CraftId): number {
    const r = RECIPES.find(r => r.id === id);
    let count = Math.max(this.state.crafted[id] ?? 0, s.craftedIds.has(id) ? 1 : 0);
    if (r?.tool && s.tools[r.tool] >= (r.tier ?? 1)) count = Math.max(count, 1);
    if (r?.output && isEquipKind(r.output)) {
      const def = EQUIPMENT[r.output];
      const owned = [...Object.values(s.equipment.snapshot()), ...s.inventory.snapshot().map(slot => slot?.kind)];
      if (owned.some(kind => kind && isEquipKind(kind) && EQUIPMENT[kind].slot === def.slot && EQUIPMENT[kind].score >= def.score)) count = Math.max(count, 1);
      // 制作过高一级装备也证明曾拥有其低级材料；丢失/升级后不退进度。
      if (RECIPES.some(next => next.output && isEquipKind(next.output) && next.cost[r.output!] && (s.craftedIds.has(next.id) || (this.state.crafted[next.id] ?? 0) > 0))) count = Math.max(count, 1);
    }
    return count;
  }
  private row(s: PlayerSession, req: QuestRequirement) {
    if (req.type === 'bench') return { label: `${req.level}级工作台`, have: Math.min(req.level, this.state.benchLevel), need: req.level };
    if (req.type === 'gather') return { label: ITEMS[req.kind].name, have: Math.min(req.count, this.state.gathered[req.kind] ?? 0), need: req.count };
    return { label: RECIPES.find(r => r.id === req.id)?.name ?? req.id, have: Math.min(req.count, this.craftCount(s, req.id)), need: req.count };
  }

  update(s: PlayerSession, benchLevel: number, delta: number, upgrading = false, furDropped = false): void {
    this.celebrate = Math.max(0, this.celebrate - delta);
    this.state.gathered.fur = Math.max(this.state.gathered.fur ?? 0, s.inventory.count('fur'));
    this.state.benchLevel = Math.max(this.state.benchLevel, benchLevel);
    if (this.legacy) {
      for (const slot of s.inventory.snapshot()) if (slot) this.state.gathered[slot.kind] = Math.max(this.state.gathered[slot.kind] ?? 0, slot.count);
      if (s.tools.axe && s.tools.pickaxe) this.state.done.push('supplies');
      if (benchLevel > 0 || s.craftedIds.has('workbench')) this.state.done.push('materials');
      if (benchLevel >= 2) this.state.done.push('fur', 'rope');
      if (benchLevel >= 2 && ['furHat', 'furShirt', 'furPants', 'furBackpack'].every(id => this.craftCount(s, id as CraftId) > 0)) this.state.done = QUESTS.map(q => q.id);
    }
    for (const quest of QUESTS) {
      if (!this.state.done.includes(quest.id) && quest.requirements.every(req => { const row = this.row(s, req); return row.have >= row.need; })) this.state.done.push(quest.id);
    }
    // 核心目标已达成即毕业，不要求成熟玩家补做早期采集作业。
    if (this.state.done.includes('graduate')) {
      for (const quest of QUESTS) if (!this.state.done.includes(quest.id)) {
        this.state.done.push(quest.id);
        this.state.paid.push(quest.id);
      }
    }
    const active = QUESTS.findIndex(q => !this.state.done.includes(q.id));
    if (this.legacy && active === -1) this.state.done = QUESTS.map(q => q.id);
    let completedNow = false;
    for (const quest of QUESTS) {
      if (!this.state.done.includes(quest.id) || this.state.paid.includes(quest.id)) continue;
      this.state.paid.push(quest.id);
      if (this.legacy) continue;
      completedNow = true;
      for (const [kind, n] of Object.entries(quest.reward)) {
        const k = kind as ResourceKind;
        this.state.pending[k] = (this.state.pending[k] ?? 0) + n;
      }
    }
    if (completedNow && active === -1 && this.enabled) this.celebrate = 4;
    this.legacy = false;
    // 待发奖励直接入包，满包保留剩余数；不走采集计数、不掉地、不重复领取。
    if (this.enabled) for (const [kind, n] of Object.entries(this.state.pending)) {
      const k = kind as ResourceKind;
      const added = k === 'arrow' || k === 'bait' ? s.ammo.add(k, n) : s.inventory.add(k, n);
      if (added >= n) delete this.state.pending[k];
      else this.state.pending[k] = n - added;
    }
    const quest = QUESTS[active];
    const rows = quest?.requirements.map(req => this.row(s, req)) ?? [];
    const { recipes, guide, hint } = resolveQuestObjective(s, active, rows, furDropped);
    const activity = guide?.type === 'resource'
      ? guide.kinds.reduce((sum, kind) => sum + (this.state.gathered[kind] ?? 0), 0)
      : recipes.reduce((sum, id) => sum + (this.state.crafted[id] ?? 0), 0);
    const busy = upgrading || !!(s.crafting.currentRecipe && recipes.includes(s.crafting.currentRecipe.id));
    this.view = { enabled: this.enabled, active, finished: active === -1, celebration: this.celebrate > 0, rows, done: [...this.state.done], recipes, guide, hint, activity, busy, pending: Object.keys(this.state.pending).length > 0 };
  }
}
