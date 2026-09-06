import type { CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/Game';
import { fadeStyle } from './fade';

/**
 * 左侧弹出卡片(捡回/进食/手搓合成)的共享样式:
 * 三张卡片外观一致、同一位置(左侧上边缘 30% 屏高),移动中不显示,
 * 闲置 5s 后随 HUD 淡出(见 Game.pushHud)。
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

/** 卡片外层定位样式(叠加闲置淡出) */
export function promptWrapStyle(hud: HudSnapshot): CSSProperties {
  return {
    position: 'absolute',
    left: 'max(12px, env(safe-area-inset-left))',
    top: '30%',
    ...fadeStyle(hud.busy),
  };
}
