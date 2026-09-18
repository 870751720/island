import type { HandTool } from '../entities/Player';
import type { PlayerSession } from '../mp/PlayerSession';
import type { ToolId } from './Crafting';
import type { SessionSave } from './SaveSystem';

type RestoreHooks = {
  hasTool(tool: Exclude<HandTool, 'hand'>): boolean;
  syncToolTiers(): void;
};

/** 恢复单个玩家会话；世界设施与联机名单由 Game 编排。 */
export function restoreSession(session: PlayerSession, data: SessionSave, hooks: RestoreHooks): void {
  for (const kind of data.discoveredRecipes ?? []) session.discoverRecipe(kind);
  if (data.research) session.research = { ...data.research, ingredients: [...data.research.ingredients] };
  session.quests.restore(data.quests);
  session.firstDrops.restore(data.firstDrops);
  session.player.setGender(data.gender);
  session.player.group.position.set(data.player.x, data.player.y, data.player.z);
  session.survival.state.hunger = data.survival.hunger;
  session.survival.state.thirst = data.survival.thirst;
  session.survival.state.health = data.survival.health;
  session.survival.state.stamina = data.survival.stamina;
  session.lastHealth = data.survival.health;
  session.survival.state.dead = false;
  session.inventory.load(data.slots, data.capacity);
  for (const slot of session.inventory.snapshot()) if (slot) session.discoverRecipe(slot.kind);
  session.ammo.reset();
  session.ammo.arrow = data.ammo.arrow;
  session.ammo.bait = data.ammo.bait;
  session.equipment.restore(data.equipped, session.inventory);
  for (const [id, tier] of Object.entries(data.tools)) {
    if (tier > 0) session.tools[id as ToolId] = tier;
  }
  // 保留旧档剪刀的拥有状态，并释放原先占用的物品格。
  const shearsCount = session.inventory.count('shears');
  if (shearsCount > 0) {
    session.tools.shears = 1;
    session.inventory.remove('shears', shearsCount);
  }
  session.craftedIds.clear();
  for (const id of data.crafted) session.craftedIds.add(id);
  session.stats.kills = data.stats.kills;
  session.stats.collected = data.stats.collected;
  session.survival.deathCause = null;
  hooks.syncToolTiers();
  if (data.handTool === 'hand' || hooks.hasTool(data.handTool)) session.player.setTool(data.handTool);
}

/** 将单个玩家会话编码为稳定的存档结构。 */
export function snapshotSession(session: PlayerSession): SessionSave {
  const p = session.player.group.position;
  const survival = session.survival.state;
  return {
    discoveredRecipes: [...session.discoveredRecipes],
    research: { ...session.research, ingredients: [...session.research.ingredients] },
    quests: session.quests.snapshot(),
    firstDrops: session.firstDrops.snapshot(),
    id: session.id,
    name: session.name,
    player: { x: p.x, y: p.y, z: p.z },
    survival: {
      hunger: survival.hunger,
      thirst: survival.thirst,
      health: survival.health,
      stamina: survival.stamina,
    },
    slots: session.inventory.snapshot(),
    capacity: session.inventory.capacity,
    ammo: session.ammo.snapshot(),
    tools: { ...session.tools },
    crafted: [...session.craftedIds],
    equipped: session.equipment.snapshotForSave(),
    handTool: session.player.currentTool,
    gender: session.player.currentGender,
    stats: { ...session.stats },
  };
}
