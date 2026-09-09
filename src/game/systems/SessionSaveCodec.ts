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
  session.player.setGender(data.gender ?? 'boy');
  session.player.group.position.set(data.player.x, data.player.y, data.player.z);
  session.survival.state.hunger = data.survival.hunger;
  session.survival.state.thirst = data.survival.thirst;
  session.survival.state.health = data.survival.health;
  session.survival.state.stamina = data.survival.stamina;
  session.lastHealth = data.survival.health;
  session.survival.state.dead = false;
  session.inventory.load(data.slots, data.capacity);
  session.ammo.reset();
  session.ammo.arrow = data.ammo?.arrow ?? 0;
  session.ammo.bait = data.ammo?.bait ?? 0;
  for (const slot of session.inventory.snapshot()) {
    if (slot?.kind === 'arrow' || slot?.kind === 'bait') {
      session.inventory.remove(slot.kind, slot.count);
      session.ammo.add(slot.kind, slot.count);
    }
  }
  session.equipment.restore(data.equipped, session.inventory);
  for (const [id, tier] of Object.entries(data.tools)) {
    if (tier > 0) session.tools[id as ToolId] = tier;
  }
  session.craftedIds.clear();
  for (const id of data.crafted ?? []) session.craftedIds.add(id);
  session.stats.kills = data.stats?.kills ?? 0;
  session.stats.collected = data.stats?.collected ?? 0;
  session.survival.deathCause = null;
  hooks.syncToolTiers();
  if (data.handTool === 'hand' || hooks.hasTool(data.handTool)) session.player.setTool(data.handTool);
}

/** 将单个玩家会话编码为稳定的存档结构。 */
export function snapshotSession(session: PlayerSession): SessionSave {
  const p = session.player.group.position;
  const survival = session.survival.state;
  return {
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
