import { useState } from 'react';
import type { GameMode } from '@/game/GameMode';
import { gameRowButtonStyle } from './gameTheme';
import styles from './SettingsPanel.module.css';

/** 设置「游戏」页的转模式入口:仅求生存档显示,收起时只有按钮,点击后展开说明与确认;当前模式由设置底部「继续游戏」按钮展示。 */
export function GameModeSettings({ mode, dead, onConvert }: {
  mode: GameMode;
  dead: boolean;
  onConvert: () => string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  if (mode === 'leisure') return null;
  // 收起时仅显示入口按钮,点击后才展开说明与确认。
  if (!confirming) return <button style={gameRowButtonStyle} disabled={dead} onClick={() => setConfirming(true)}>转为悠然模式</button>;
  return <section className={styles.section} aria-label="确认转换模式">
    <strong className={styles.modeWarning}>转换后，本存档永久为悠然模式</strong>
    <ul className={styles.modeHint}>
      <li>无法转回求生，退出或重新进入也不会恢复。</li>
      <li>本局不再结算荒岛传承点，包括转换前的生存天数；已有传承与增益保留。</li>
      <li>岛屿、建筑、物品和生存天数保留。死亡后可复活，仍会掉落部分随身物品；饥渴与伤害规则不变。</li>
    </ul>
    <label className={styles.guideRow}>
      <input className={styles.checkbox} type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
      <span className={styles.modeHint}>我已了解：无法转回求生，且本局不再获得传承点</span>
    </label>
    {error && <p role="alert" className={styles.modeWarning}>{error}</p>}
    {dead && <p className={styles.modeHint}>请在角色存活时转换。</p>}
    <div className={styles.modeActions}>
      <button onClick={() => { setConfirming(false); setAccepted(false); setError(''); }}>暂不转换</button>
      <button disabled={!accepted || dead} onClick={() => {
        const failure = onConvert();
        if (failure) setError(failure);
        else { setConfirming(false); setAccepted(false); setError(''); }
      }}>确认转为悠然</button>
    </div>
  </section>;
}
