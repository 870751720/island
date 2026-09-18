import { ResearchTable } from '../entities/ResearchTable';
import type { PlayerSession } from '../mp/PlayerSession';
import { FacilitySystem, type FacilityDependencies } from './FacilitySystem';
import { matchResearch, validResearch } from './HiddenRecipes';
import { ITEMS } from './Items';
import type { ResourceKind } from './Inventory';

export type ResearchState = { ingredients: ResourceKind[]; remaining: number; cooldown: number; failures: number; result: ResourceKind | 'failed' | null; serial: number };
export function emptyResearch(): ResearchState { return { ingredients: [], remaining: 0, cooldown: 0, failures: 0, result: null, serial: 0 }; }

export class ResearchTableSystem extends FacilitySystem<'researchTable'> {
  constructor(dependencies: FacilityDependencies, private readonly notify: (text: string, actor: PlayerSession) => void) {
    super(dependencies, { create: (scene, at) => new ResearchTable(scene, at), color: () => '#e9d5a9' }, 'research');
  }
  nearby(actor: PlayerSession): boolean {
    const p = actor.player.group.position;
    return this.facilities.some(f => Math.hypot(f.group.position.x - p.x, f.group.position.z - p.z) < 2.2);
  }
  start(actor: PlayerSession, kinds: ResourceKind[]): boolean {
    const s = actor.research;
    if (!this.nearby(actor) || actor.survival.state.dead || s.remaining > 0 || s.cooldown > 0 || !validResearch(kinds)) return false;
    if (kinds.some(k => actor.inventory.count(k) < 1)) { this.notify('食材不足，请重新选择', actor); return false; }
    const recipe = matchResearch(kinds);
    if (recipe && actor.discoveredRecipes.has(recipe.kind)) { this.notify('已发现此配方，可在烹饪台制作', actor); return false; }
    for (const kind of kinds) actor.inventory.remove(kind, 1);
    s.ingredients = [...kinds]; s.remaining = 2; s.result = null; s.serial++;
    return true;
  }
  advance(actor: PlayerSession, delta: number): void {
    const s = actor.research;
    s.cooldown = Math.max(0, s.cooldown - delta);
    if (s.remaining <= 0) return;
    s.remaining = Math.max(0, s.remaining - delta);
    if (s.remaining > 0) return;
    const recipe = matchResearch(s.ingredients);
    if (recipe) {
      actor.discoverRecipe(recipe.kind);
      s.result = recipe.kind;
      const packed = this.dependencies.give(recipe.kind, 1, actor);
      this.notify(`发现新料理：${ITEMS[recipe.kind].name}！已解锁烹饪配方${packed ? '，获得一份成品' : '，成品放在脚边'}`, actor);
    } else {
      s.result = 'failed'; s.cooldown = 5; s.failures++;
      this.notify('这次没有做成新料理，整理台面 5 秒后再试', actor);
    }
  }
}
