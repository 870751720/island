import type { CSSProperties } from 'react';
import { MAX_HUD_TOP_OFFSET } from './useHudLayout';
import { gameButtonStyle } from '../gameTheme';
import styles from '../SettingsPanel.module.css';

/** 透明遮罩拦截游戏触控，底部控制区留出顶部真实 HUD 的预览空间。 */
export function HudLayoutAdjuster({ value, onChange, onClose }: {
  value: number;
  onChange: (value: number) => void;
  onClose: () => void;
}) {
  return <div className={styles.adjustOverlay}>
    <div className={styles.adjustPanel} role="dialog" aria-modal="true" aria-label="调整顶部 UI 边距">
      <label className={styles.sliderRow}>
        <span className={styles.sliderHeading}><strong>顶部额外边距</strong><span>{value} px</span></span>
        <input type="range" min={0} max={MAX_HUD_TOP_OFFSET} step={1} value={value}
          onChange={event => onChange(Number(event.target.value))} className={styles.range}
          aria-valuetext={`${value} 像素`} style={{ '--volume': `${value / MAX_HUD_TOP_OFFSET * 100}%` } as CSSProperties} />
      </label>
      <p className={styles.adjustHint}>自动避让安全区域，再额外下移。横屏或矮屏最多下移屏幕高度的 15%。</p>
      <div className={styles.adjustActions}>
        <button style={gameButtonStyle} onClick={() => onChange(0)}>恢复默认</button>
        <button style={gameButtonStyle} onClick={onClose}>完成</button>
      </div>
    </div>
  </div>;
}
