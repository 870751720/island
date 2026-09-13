import { ActionButton } from './controls';

export function BuffTestControls({ onSetCount }: { onSetCount: (count: number) => void }) {
  return (
    <div role="group" aria-label="Buff 布局测试" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
      {[5, 10, 20, 50, 100, 0].map((count) => (
        <ActionButton key={count} label={count ? `测试 ${count} 个 Buff` : '清除测试 Buff'} onClick={() => onSetCount(count)} />
      ))}
    </div>
  );
}
