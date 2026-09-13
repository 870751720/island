import { gameTheme } from './gameTheme';
import type { CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/GameContracts';
import { fadeStyle } from './fade';

/**
 * 弹出卡片(捡回/进食/手搓合成)的共享样式:
 * 三张卡片外观一致、同一位置(右下角工具按钮下方),移动中不显示,
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
  border: gameTheme.selectionBorder,
  background: gameTheme.panel,
  color: gameTheme.ink,
  fontFamily: gameTheme.font,
  fontSize: 15,
  textAlign: 'left',
  touchAction: 'none',
  userSelect: 'none',
  boxShadow: gameTheme.shadow,
};

/** 卡片外层定位样式(叠加闲置淡出):挂在右下角工具按钮下方一点 */
export function promptWrapStyle(hud: HudSnapshot): CSSProperties {
  // 工具按钮:右侧 16px、垂直居中、直径 72;卡片落在其下方并靠右对齐
  return {
    position: 'absolute',
    right: 'max(16px, env(safe-area-inset-right))',
    top: 'calc(50% + 46px)',
    ...fadeStyle(hud.busy),
  };
}
