/**
 * HUD 按钮/弹出卡片「忙碌时淡出」的共享过渡样式:
 * 只用透明度过渡(不加位移/缩放,避免与按钮自身的 transform 冲突),
 * 淡出后同时禁用点击,避免半透明按钮误触。
 * busy 仅由交互(作业/钓鱼等)触发,纯移动不淡出(见 Game.isPlayerBusy)。
 */
export function fadeStyle(hidden: boolean): {
  opacity: number;
  pointerEvents: 'none' | 'auto';
  transition: string;
} {
  return {
    opacity: hidden ? 0 : 1,
    pointerEvents: hidden ? 'none' : 'auto',
    transition: 'opacity 0.5s ease',
  };
}
