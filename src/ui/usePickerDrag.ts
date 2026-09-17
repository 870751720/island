import { gamePoint, gameRect } from '@/platform/displayCoordinates';
import { useLayoutEffect, useRef, useState } from 'react';

export interface PickerPress {
  pointerId: number;
  source: HTMLElement;
  start: { x: number; y: number };
}

/** 松手选择会卸载菜单，尾随 click 的保护必须独立存活到下一次按下。 */
export function suppressReleaseClick() {
  const clear = () => {
    window.removeEventListener('click', swallow, true);
    window.removeEventListener('pointerdown', clear, true);
    window.clearTimeout(timer);
  };
  const swallow = (event: MouseEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    clear();
  };
  const timer = window.setTimeout(clear, 800);
  window.addEventListener('click', swallow, true);
  window.addEventListener('pointerdown', clear, true);
}

/** 只接管打开菜单的触点；后续点按和原生滚动继续由菜单处理。 */
export function usePickerDrag(press: PickerPress | null, onSelect: (key: string) => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const latest = useRef(onSelect);
  latest.current = onSelect;
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  useLayoutEffect(() => {
    if (!press) return;
    let active = true;
    let point: { x: number; y: number } | null = null;
    let frame = 0;
    let lastTime = 0;
    setDragging(true);
    const hit = () => {
      const panel = panelRef.current;
      if (!panel || !point) return null;
      const target = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>('[data-picker-key]');
      return target && panel.contains(target) ? target.dataset.pickerKey ?? null : null;
    };
    const tick = (time: number) => {
      const panel = panelRef.current;
      const dt = lastTime ? Math.min(time - lastTime, 32) : 0;
      lastTime = time;
      if (panel && point) {
        const rect = gameRect(panel);
        const local = gamePoint({ clientX: point.x, clientY: point.y });
        if (local.x >= rect.left && local.x <= rect.right && local.y >= rect.top && local.y <= rect.bottom) {
          const edge = 30;
          const speed = local.y < rect.top + edge ? -(rect.top + edge - local.y) / edge
            : local.y > rect.bottom - edge ? (local.y - rect.bottom + edge) / edge : 0;
          panel.scrollTop += speed * dt * 0.32;
        }
        setHovered(hit());
      }
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      active = false;
      cancelAnimationFrame(frame);
      setDragging(false);
      setHovered(null);
    };
    const move = (event: PointerEvent) => {
      if (!active || event.pointerId !== press.pointerId) return;
      if (!point && Math.hypot(event.clientX - press.start.x, event.clientY - press.start.y) <= 12) return;
      point = { x: event.clientX, y: event.clientY };
      setHovered(hit());
    };
    const up = (event: PointerEvent) => {
      if (!active || event.pointerId !== press.pointerId) return;
      // 未移动时只展开菜单，避免菜单恰好覆盖原按钮造成误选。
      if (point) point = { x: event.clientX, y: event.clientY };
      const key = hit();
      suppressReleaseClick();
      stop();
      if (key) latest.current(key);
    };
    const cancel = (event: PointerEvent) => {
      if (event.pointerId === press.pointerId) stop();
    };
    const hide = () => { if (document.hidden) stop(); };
    frame = requestAnimationFrame(tick);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', cancel, true);
    press.source.addEventListener('lostpointercapture', cancel);
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', hide);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', cancel, true);
      press.source.removeEventListener('lostpointercapture', cancel);
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [press]);
  return { panelRef, hovered, dragging };
}
