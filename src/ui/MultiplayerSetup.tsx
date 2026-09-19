import { useState } from 'react';
import type { ConnectionMode } from '@/game/net/ConnectionMode';
import { ConnectionSelector } from './ConnectionSelector';
import { VirtualLanOptions } from './VirtualLanOptions';
import { useRelayAvailability } from './useRelayAvailability';
import type { MultiplayerSection } from './SettingsPanel';
import styles from './MultiplayerSetup.module.css';

/** 点击开启多人模式后才挂载，确认前不创建房间。 */
export function MultiplayerSetup({ multiplayer, onBack }: {
  multiplayer: MultiplayerSection;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<ConnectionMode>('direct');
  const [submitted, setSubmitted] = useState(false);
  const availability = useRelayAvailability(mode, !multiplayer.busy);
  const full = mode === 'relay' && availability.full;
  return <div className={styles.overlay} onPointerDown={event => {
    if (event.target === event.currentTarget && !multiplayer.busy) onBack();
  }}>
    <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="multiplayer-setup-title">
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>一起靠岸</span><h2 id="multiplayer-setup-title">开启多人模式</h2></div>
        <button className={styles.close} disabled={multiplayer.busy} onClick={onBack} aria-label="返回设置">×</button>
      </header>
      <div className={styles.content}>
        <p className={styles.description}>继续当前岛屿，选择连接方式后邀请朋友加入。</p>
        <ConnectionSelector value={mode} disabled={multiplayer.busy} availability={availability}
          onChange={value => { setMode(value); setSubmitted(false); }} />
        {mode === 'direct' && <VirtualLanOptions disabled={multiplayer.busy} />}
        {submitted && multiplayer.error && <p className={styles.error} role="status">{multiplayer.error}</p>}
      </div>
      <footer className={styles.actions}>
        <button disabled={multiplayer.busy} onClick={onBack}>返回</button>
        <button className={styles.primary} disabled={multiplayer.busy || full} onClick={() => {
          setSubmitted(true);
          multiplayer.onEnable(mode);
        }}>{multiplayer.busy ? '正在创建…' : full ? '中转房间已满' : '确认创建房间'}</button>
      </footer>
    </section>
  </div>;
}
