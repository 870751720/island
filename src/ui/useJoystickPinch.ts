import { useRef } from 'react';
import type { PointerEvent } from 'react';

/** 仅接收空白触控层的触点；双指结束后需全部松手才能恢复摇杆。 */
export function useJoystickPinch(onZoom: (factor: number) => void, onEnd: () => void) {
  const points = useRef(new Map<number, { x: number; y: number }>());
  const pinching = useRef(false);
  const distance = useRef(0);
  const measure = () => {
    const [a, b] = [...points.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  return {
    down(e: PointerEvent): boolean {
      points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (points.current.size >= 2) pinching.current = true;
      distance.current = measure();
      return pinching.current;
    },
    move(e: PointerEvent): boolean {
      if (points.current.has(e.pointerId)) {
        points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const next = measure();
        if (pinching.current && distance.current > 0 && next > 0) onZoom(next / distance.current);
        distance.current = next;
      }
      return pinching.current;
    },
    up(e: PointerEvent): boolean {
      const wasPinching = pinching.current;
      points.current.delete(e.pointerId);
      distance.current = measure();
      if (wasPinching) onEnd();
      if (points.current.size === 0) pinching.current = false;
      return wasPinching;
    },
  };
}
