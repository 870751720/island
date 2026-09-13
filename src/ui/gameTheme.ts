import type { CSSProperties } from 'react';

/** 游戏内面板沿用 HUD 的奶油与鼠尾草色；不用于开始页。 */
export const gameTheme = {
  ink: '#49665e',
  muted: '#697b6b',
  accent: '#446c57',
  warning: '#916329',
  danger: '#a04f43',
  panel: 'linear-gradient(145deg,#fff9e4f5,#dce8d6f2)',
  surface: '#fffaf0d9',
  inset: '#58786112',
  selected: 'linear-gradient(145deg,#f5edcf,#cddfc7)',
  action: 'linear-gradient(145deg,#e9f0d9,#cadfc4)',
  disabled: '#dee2d4',
  dangerSurface: '#f2dfd1',
  overlay: 'rgba(32,55,47,0.38)',
  border: '1px solid #fff8e9bb',
  line: '1px solid #58786130',
  selectionBorder: '2px solid #789b7c',
  shadow: '0 8px 28px #314c3e26,inset 0 1px 0 #ffffffcc',
  controlShadow: '0 3px 9px #314c3e24,inset 0 1px 0 #ffffffcc',
  font: 'Arial,"PingFang SC","Microsoft YaHei",sans-serif',
} as const;

export const gamePanelStyle: CSSProperties = {
  background: gameTheme.panel,
  color: gameTheme.ink,
  border: gameTheme.border,
  borderRadius: 22,
  boxShadow: gameTheme.shadow,
  fontFamily: gameTheme.font,
  maxHeight: 'calc(80dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
  overflowY: 'auto',
};

export const gameButtonStyle: CSSProperties = {
  minHeight: 44,
  border: gameTheme.line,
  borderRadius: 12,
  background: gameTheme.action,
  color: gameTheme.ink,
  boxShadow: gameTheme.controlShadow,
  fontFamily: gameTheme.font,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
};

/** 暗场界面(拍照分享、死亡与复活结算)的深色主题:夜色松绿底 + 奶油文字,与浅色主题同源 */
export const gameDarkTheme = {
  ink: '#f2ecdc',
  muted: '#a9b8ac',
  accent: '#a7c9b2',
  warning: '#e6c07c',
  /** 深松绿夜色底 */
  panel: 'linear-gradient(165deg,#243530f2,#0d1714f7)',
  /** 波塞冬庇佑用的深海夜色底 */
  ocean: 'linear-gradient(165deg,#16343af2,#0a1b21f7)',
  surface: '#f2ecdc1c',
  line: '1px solid #f2ecdc33',
} as const;

export const gameDarkButtonStyle: CSSProperties = {
  minHeight: 44,
  border: gameDarkTheme.line,
  borderRadius: 12,
  background: gameDarkTheme.surface,
  color: gameDarkTheme.ink,
  fontFamily: gameTheme.font,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
};

export const gameThemeCss = `
.gameplay-ui button:focus-visible{outline:2px solid #609e91;outline-offset:3px}
.gameplay-ui button:disabled{opacity:.48;cursor:default}
.gameplay-ui button:not(.hud-control){-webkit-tap-highlight-color:transparent;transition:filter .15s ease,box-shadow .15s ease}
.gameplay-ui button:not(.hud-control):active:not(:disabled){filter:brightness(.95);box-shadow:inset 0 2px 5px #314c3e20}
@media(prefers-reduced-motion:reduce){.gameplay-ui button,.gameplay-ui [style*="animation"]{animation:none!important;transition:none!important}}
`;
