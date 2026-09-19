import type { ConnectionMode } from '@/game/net/ConnectionMode';
import { useEffect, useState } from 'react';
import { DIRECT_UNAVAILABLE, supportsDirectConnection } from '@/game/net/DirectSupport';
import { WebMultiplayerGuide } from './WebMultiplayerGuide';
import type { useRelayAvailability } from './useRelayAvailability';
import styles from './ConnectionSelector.module.css';

/** 好友直连在左、服务器中转在右;开房端中转满员时卡片标「已满」并在直连态给出提示,仅用于房主创建房间。 */
export function ConnectionSelector({ value, onChange, disabled, availability }: {
  value: ConnectionMode;
  onChange: (value: ConnectionMode) => void;
  disabled?: boolean;
  availability: ReturnType<typeof useRelayAvailability>;
}) {
  const { status, error, loading, full, refresh } = availability;
  const [directSupported, setDirectSupported] = useState<boolean | null>(null);
  useEffect(() => { setDirectSupported(supportsDirectConnection()); }, []);
  const createFull = full;
  return <section className={styles.section} aria-label="连接方式">
    <div className={styles.heading}><strong>连接方式</strong><span>开房后固定本次连接方式</span></div>
    <div className={styles.choices}>
      {([
        { id: 'direct', title: '好友直连', badge: '默认' },
        { id: 'relay', title: '服务器中转', badge: '免费限量' },
      ] as const).map(choice => {
        const fullBadge = choice.id === 'relay' && createFull && value !== choice.id;
        return <button key={choice.id} type="button"
          className={`${styles.choice} ${value === choice.id ? styles.selected : ''}`}
          disabled={disabled} aria-pressed={value === choice.id}
          onClick={() => onChange(choice.id)}>
          <span className={styles.copy}><strong>{choice.title}</strong></span>
          <span className={fullBadge ? `${styles.badge} ${styles.full}` : styles.badge}>
            {choice.id === 'direct' && directSupported === false ? '需网页版' : value === choice.id ? '已选' : fullBadge ? '已满' : choice.badge}
          </span>
        </button>;
      })}
    </div>
    <div className={styles.status} role="status">
      {value === 'direct' ? directSupported === false ? <>
        <span>{DIRECT_UNAVAILABLE}</span>
        <WebMultiplayerGuide />
      </> : <>
        <span>好友直连由你的设备与朋友直接连接，需要双方网络可以互通。如果连接失败，说明双方当前的网络暂不支持好友直连。</span>
      </> : <>
        <span>服主目前略微有点寒酸，中转只提供 {status?.maxRooms ?? 150} 个免费房间，满了需要排队等其他玩家下线。服务器中转可能会比较卡，可以尝试好友直连。</span>
        {status ? <>
          <span>中转房间 {status.rooms} / {status.maxRooms} · 每房最多 {status.maxPlayers} 人，含房主</span>
          {full && <span>开房名额已满，可稍后重试或选择好友直连</span>}
        </> : <span>{error || '正在查看中转名额…'}</span>}
        {(error || full) && <button type="button" onClick={refresh} disabled={disabled || loading}>{loading ? '刷新中…' : '刷新名额'}</button>}
      </>}
    </div>
  </section>;
}
