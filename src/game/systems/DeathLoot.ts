import type { PlayerSession } from '../mp/PlayerSession';
import { DEATH_DROP_RATIO, PLANT_DROP_KINDS } from '../GameConfig';
import { DEFAULT_CAPACITY, type ResourceKind } from './Inventory';
import { itemCategory, itemSortIndex } from './Items';

export type DeathLootItem = { kind: ResourceKind; count: number };
/** 只传最多三类明细，避免死亡界面和客人 HUD 随背包大小膨胀。 */
export type DeathLootSummary = { kindCount: number; items: DeathLootItem[] };

/** 房主/单机生成实际掉落，同时记录本次可捡回的物品；工具按统一分类豁免。 */
export function settleDeathLoot(
  session: PlayerSession,
  drop: (kind: ResourceKind, count: number) => void,
): DeathLootSummary {
  const dropped = new Map<ResourceKind, number>();
  const record = (kind: ResourceKind, count: number) => {
    if (count <= 0 || itemCategory(kind) === '工具') return;
    drop(kind, count);
    dropped.set(kind, (dropped.get(kind) ?? 0) + count);
  };
  for (const slot of session.inventory.snapshot()) {
    if (!slot) continue;
    const ratio = PLANT_DROP_KINDS.includes(slot.kind) ? 1 : DEATH_DROP_RATIO;
    record(slot.kind, Math.round(slot.count * ratio));
  }
  for (const kind of ['arrow', 'bait'] as const) {
    const count = Math.round(session.ammo.count(kind) * DEATH_DROP_RATIO);
    record(kind, count);
    session.ammo.remove(kind, count);
  }
  for (const kind of Object.values(session.equipment.snapshot())) {
    if (kind && Math.random() < DEATH_DROP_RATIO) record(kind, 1);
  }
  const items = dropped.size <= 3
    ? [...dropped].map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => itemSortIndex(a.kind) - itemSortIndex(b.kind))
    : [];
  return { kindCount: dropped.size, items };
}

/** 重生保留已拥有工具的等级和背包工具，其余携带重置沿用既有规则。 */
export function resetRespawnBelongings(session: PlayerSession): void {
  const tools = session.inventory.snapshot().filter(slot => slot && itemCategory(slot.kind) === '工具');
  session.inventory.reset();
  session.equipment.reset();
  session.ammo.reset();
  session.inventory.load(tools, Math.max(DEFAULT_CAPACITY, tools.length));
}
