import { useRef, type PointerEvent } from 'react';
import { suppressReleaseClick } from './usePickerDrag';

/** 在稳定节点上配对按下/松手，滚动或取消不选中；不依赖浏览器合成 click。 */
export function usePickerTap(onSelect: (key: string) => void, onClose: () => void) {
  const press = useRef<{ id: number; x: number; y: number; target: HTMLElement; key: string | null } | null>(null);
  const cancel = () => { press.current = null; };
  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.button !== 0 || press.current) return;
      const target = (event.target as Element).closest<HTMLElement>('[data-picker-key]');
      if (!target && event.target !== event.currentTarget) return;
      const source = target ?? event.currentTarget;
      source.setPointerCapture(event.pointerId);
      press.current = { id: event.pointerId, x: event.clientX, y: event.clientY,
        target: source, key: target?.dataset.pickerKey ?? null };
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const start = press.current;
      if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) cancel();
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const start = press.current;
      if (!start || start.id !== event.pointerId) return;
      cancel();
      suppressReleaseClick();
      const target = document.elementFromPoint(event.clientX, event.clientY);
      if (!target || !start.target.contains(target)
        || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return;
      // 遮罩捕获触点后，移进面板再松手不能算点击背景。
      if (start.key === null) {
        if (target === start.target) onClose();
      } else onSelect(start.key);
    },
    onPointerCancel(event: PointerEvent<HTMLDivElement>) {
      if (press.current?.id === event.pointerId) cancel();
    },
    onLostPointerCapture(event: PointerEvent<HTMLDivElement>) {
      if (press.current?.id === event.pointerId) cancel();
    },
  };
}
