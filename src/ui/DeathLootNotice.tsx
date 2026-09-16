import type { DeathLootSummary } from '@/game/systems/DeathLoot';
import { ITEMS } from '@/game/systems/Items';
import { ItemIcon } from './ItemIcon';
import { gameDarkTheme } from './gameTheme';

/** 三秒复活期间直接可读，无需展开或滚动长清单。 */
export function DeathLootNotice({ summary }: { summary: DeathLootSummary }) {
  return (
    <div role="status" style={{
      width: 'min(100%, 320px)', boxSizing: 'border-box', flexShrink: 0,
      padding: '12px 16px', borderRadius: 16, background: gameDarkTheme.surface,
      color: gameDarkTheme.ink, textAlign: 'center', fontSize: 14, lineHeight: 1.6,
    }}>
      <div style={{ color: gameDarkTheme.accent }}>工具和等级都为你保留着</div>
      <div style={{ marginTop: 4 }}>
        {summary.kindCount === 0 ? '这次没有物品掉在地上' : summary.kindCount > 3
          ? `有 ${summary.kindCount} 类物品留在了倒下的地方`
          : '这些物品留在了倒下的地方'}
      </div>
      {summary.items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 12px', marginTop: 8 }}>
          {summary.items.map(item => (
            <span key={item.kind} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ItemIcon kind={item.kind} size={22} />
              <span>{ITEMS[item.kind].name} ×{item.count}</span>
            </span>
          ))}
        </div>
      )}
      {summary.kindCount > 0 && (
        <div style={{ marginTop: 6, color: gameDarkTheme.muted, fontSize: 12 }}>休息一下，再回去捡回吧</div>
      )}
    </div>
  );
}
