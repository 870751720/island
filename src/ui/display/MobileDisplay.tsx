'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
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
          自动记住本机选择。开启后尝试全屏横向显示；未自动旋转时，请将手机横过来。
        </span>
      </span>
      <input type="checkbox" className={settingsStyles.checkbox} checked={landscape}
        aria-label="横屏模式" aria-describedby="landscape-setting-hint"
        onChange={event => setLandscapeMode(event.target.checked)} />
    </label>
  </div>;
}

/** 挂在阶段路由外，开始页、游戏和联机大厅共用同一份方向偏好。 */
export function MobileDisplay() {
  const { mobile, landscape } = useMobileDisplay();
  useEffect(() => {
    if (!isMobileDevice()) return;
    const controller = new LandscapeController();
    const update = () => controller.setEnabled(getLandscapeMode());
    update();
    const unsubscribe = subscribeDisplaySettings(update);
    return () => { unsubscribe(); controller.dispose(); };
  }, []);
  if (!mobile || !landscape) return null;
  return <aside className={styles.hint} aria-label="横屏模式提示">
    <span role="status">请将手机横过来<br /><small>未旋转时，请开启系统自动旋转</small></span>
    <button onClick={() => setLandscapeMode(false)}>关闭横屏</button>
  </aside>;
}
