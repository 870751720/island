import { useMemo, useRef, type MouseEvent, type PointerEvent } from 'react';

/** 按下即结算、且会让手指下方内容变化的动作(打开图鉴、关闭弹层、返回列表):在捕获阶段吞掉本次手势的尾随 click,避免误触随后出现的下层 UI;下一次按下开始新手势时提前解除,800ms 兜底超时。 */
export function swallowTrailingClick(): void {
  const cleanup = () => {
    document.removeEventListener('click', stopClick, true);
    document.removeEventListener('pointerdown', endGuard, true);
    clearTimeout(timer);
  };
  const stopClick = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    cleanup();
  };
  const endGuard = () => cleanup();
  const timer = setTimeout(cleanup, 800);
  document.addEventListener('click', stopClick, true);
  document.addEventListener('pointerdown', endGuard, true);
}

/** 滚动列表内的格子点击:在同一按钮上配对按下与抬起,位移不超过 12px 才触发,被滚动或触点取消不触发;click 仅保留键盘与辅助技术激活。 */
export function useScrollAreaTap(onTap: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return useMemo(
    () => ({
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (event.button !== 0 || event.currentTarget.disabled) return;
        start.current = { x: event.clientX, y: event.clientY };
      },
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        const pressed = start.current;
        start.current = null;
        if (!pressed || event.button !== 0 || event.currentTarget.disabled) return;
        if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 12) return;
        onTap();
      },
      onPointerCancel() {
        start.current = null;
      },
      onClick(event: MouseEvent<HTMLButtonElement>) {
        if (event.detail === 0 && !event.currentTarget.disabled) onTap();
      },
    }),
    [onTap]
  );
}
