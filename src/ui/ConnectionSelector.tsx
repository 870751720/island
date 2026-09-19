import type { ConnectionMode } from '@/game/net/ConnectionMode';
import type { useRelayAvailability } from './useRelayAvailability';
import styles from './ConnectionSelector.module.css';

export function ConnectionSelector({ value, onChange, disabled, availability, joining = false }: {
  value: ConnectionMode;
  onChange: (value: ConnectionMode) => void;
  disabled?: boolean;
  availability: ReturnType<typeof useRelayAvailability>;
  joining?: boolean;
}) {
  const { status, error, loading, full, refresh } = availability;
  return <section className={styles.section} aria-label="连接方式">
    <div className={styles.heading}><strong>连接方式</strong><span>{joining ? '与房主选择相同方式' : '开房后固定本次连接方式'}</span></div>
    <div className={styles.choices}>
      {([
        { id: 'direct', title: '好友直连', detail: '当前连接方式', badge: '默认', icon: '↔' },
        { id: 'relay', title: '服务器中转', detail: '直连困难时可尝试', badge: '限量', icon: '⇄' },
      ] as const).map(choice => <button key={choice.id} type="button"
        className={`${styles.choice} ${value === choice.id ? styles.selected : ''}`}
        disabled={disabled} aria-pressed={value === choice.id}
        onClick={() => onChange(choice.id)}>
        <span className={styles.icon} aria-hidden="true">{choice.icon}</span>
        <span className={styles.copy}><strong>{choice.title}</strong><small>{choice.detail}</small></span>
        <span className={styles.badge}>{value === choice.id ? '已选' : choice.badge}</span>
      </button>)}
    </div>
    {value === 'relay' && <div className={styles.status} role="status">
      {status ? <>
        <span>中转房间 {status.rooms} / {status.maxRooms} · 每房最多 {status.maxPlayers} 人，含房主</span>
        {full && <span>{joining ? '开房名额已满，已有房间仍可加入空位' : '开房名额已满，可稍后重试或选择好友直连'}</span>}
      </> : <span>{error || '正在查看中转名额…'}</span>}
      {(error || full) && <button type="button" onClick={refresh} disabled={disabled || loading}>{loading ? '刷新中…' : '刷新名额'}</button>}
    </div>}
  </section>;
}
