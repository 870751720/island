'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { isMobileDevice } from '@/platform/device';
import { getLandscapeMode, setLandscapeMode, subscribeDisplaySettings } from '@/platform/displaySettings';
import { LandscapeController } from '@/platform/LandscapeController';
import settingsStyles from '../SettingsPanel.module.css';
import styles from './MobileDisplay.module.css';

function useMobileDisplay() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => setMobile(isMobileDevice()), []);
  const landscape = useSyncExternalStore(subscribeDisplaySettings, getLandscapeMode, () => false);
  return { mobile, landscape };
}

export function MobileDisplaySetting() {
  const { mobile, landscape } = useMobileDisplay();
  if (!mobile) return null;
  return <div className={settingsStyles.section}>
    <label className={settingsStyles.guideRow}>
      <span className={settingsStyles.guideText}>
        <span className={settingsStyles.guideTitle}>横屏模式</span>
        <span className={settingsStyles.guideHint} id="landscape-setting-hint">
          开启后立即横向显示，无需开启系统自动旋转。自动记住本机选择。
        </span>
      </span>
      <input type="checkbox" className={settingsStyles.checkbox} checked={landscape}
        aria-label="横屏模式" aria-describedby="landscape-setting-hint"
        onChange={event => setLandscapeMode(event.target.checked)} />
    </label>
  </div>;
}

/** 挂在阶段路由外，开始页、游戏和联机大厅共用同一份方向偏好。 */
export function MobileDisplay({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!root.current) return;
    const controller = new LandscapeController(root.current);
    const update = () => controller.setEnabled(isMobileDevice() && getLandscapeMode());
    update();
    const unsubscribe = subscribeDisplaySettings(update);
    return () => { unsubscribe(); controller.dispose(); };
  }, []);
  return <div ref={root} id="game-viewport" className={styles.viewport}>{children}</div>;
}
