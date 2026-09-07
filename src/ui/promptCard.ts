import type { CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/Game';
import { fadeStyle } from './fade';

/**
 * 左侧弹出卡片(捡回/进食/手搓合成)的共享样式:
 * 三张卡片外观一致、同一位置,移动中不显示,
 * 闲置 5s 后随 HUD 淡出(见 Game.pushHud)。
 *
 * 默认在左侧上边缘 20% 屏高;设置里可切换到右下角(工具按钮下方)。
 */
export const promptCardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 150,
  minHeight: 56,
  padding: '8px 16px',
  borderRadius: 14,
  border: '2px solid #4caf50',
  background: 'rgba(255,255,255,0.92)',
  color: '#333',
  fontFamily: 'sans-serif',
  fontSize: 15,
  textAlign: 'left',
  touchAction: 'none',
  userSelect: 'none',
  boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
};

/** 卡片外层定位样式(叠加闲置淡出);rightBottom 时改挂右下角工具按钮下方 */
export function promptWrapStyle(hud: HudSnapshot, bottomRight = false): CSSProperties {
  return {
    position: 'absolute',
    ...(bottomRight
      ? {
          // 工具按钮:右侧 16px、垂直居中、直径 72;卡片落在其下方一点并靠右对齐
          right: 'max(16px, env(safe-area-inset-right))',
          top: 'calc(50% + 46px)',
        }
      : { left: 'max(12px, env(safe-area-inset-left))', top: '20%' }),
    ...fadeStyle(hud.busy),
  };
}

const STORAGE_KEY = 'promptCardBottomRight';

/** 读取「卡片放右下角」设置(默认关闭) */
export function loadPromptCardBottomRight(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** 持久化并返回新值 */
export function savePromptCardBottomRight(value: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // 隐私模式等场景下写入失败,仅当次会话生效
  }
}
