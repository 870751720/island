import { useState } from 'react';
import type { GameMode } from '@/game/GameMode';
import styles from './SettingsPanel.module.css';

/** 设置「游戏」页的转模式入口:仅求生存档显示;当前模式改由设置底部「继续游戏」按钮展示。 */
export function GameModeSettings({ mode, dead, onConvert }: {
  mode: GameMode;
  dead: boolean;
  onConvert: () => string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  if (mode === 'leisure') return null;
  return <section className={styles.section} aria-label="转为悠然模式">
    {confirming ? <div aria-label="确认转换模式">
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
      </div> : <>
        <p className={styles.modeHint}>想继续经营这座岛？可转为死亡后能复活的悠然模式。转换不可撤销，本局将不再获得传承点。</p>
        <button className={styles.modeEntry} disabled={dead} onClick={() => setConfirming(true)}>转为悠然模式</button>
        {dead && <p className={styles.modeHint}>请在角色存活时转换。</p>}
      </>}
  </section>;
}
