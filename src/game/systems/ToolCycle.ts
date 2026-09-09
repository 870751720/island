import type { HandTool } from '../entities/Player';
import type { PlayerSession } from '../mp/PlayerSession';
import type { CycleEntry } from '../GameTypes';
import type { ResourceKind } from './Inventory';

export type ToolCyclePlacement = {
  supports(kind: ResourceKind): boolean;
  toolOf(kind: ResourceKind): HandTool | null;
  heldKind(session: PlayerSession): ResourceKind | null;
};

export function listPlaceables(
  session: PlayerSession,
  placement: ToolCyclePlacement,
  lastKind: ResourceKind | null
): { kind: ResourceKind; count: number }[] {
  const seen = new Set<ResourceKind>();
  const list: { kind: ResourceKind; count: number }[] = [];
  const push = (kind: ResourceKind) => {
    if (seen.has(kind)) return;
    seen.add(kind);
    list.push({ kind, count: session.inventory.count(kind) });
  };
  if (lastKind && placement.supports(lastKind)) push(lastKind);
  for (const slot of session.inventory.snapshot()) {
    if (slot && placement.supports(slot.kind)) push(slot.kind);
  }
  return list.filter((entry) => entry.count > 0);
}

export function nextToolEntry(
  session: PlayerSession,
  placement: ToolCyclePlacement,
  lastKind: ResourceKind | null,
  hasTool: (tool: Exclude<HandTool, 'hand'>) => boolean
): CycleEntry {
  const order: HandTool[] = ['hand', 'axe', 'pickaxe', 'shovel', 'fishingrod', 'bow', 'sword', 'lasso'];
  const entries: CycleEntry[] = order
    .filter((tool) => tool === 'hand' || hasTool(tool))
    .map((tool) => ({ tool, kind: null }));
  for (const { kind } of listPlaceables(session, placement, lastKind)) {
    entries.push({ tool: placement.toolOf(kind) ?? 'place', kind });
  }
  const current: CycleEntry = { tool: session.player.currentTool, kind: placement.heldKind(session) };
  const index = entries.findIndex((entry) => entry.tool === current.tool && entry.kind === current.kind);
  return entries[(index + 1) % entries.length] ?? entries[0];
}
