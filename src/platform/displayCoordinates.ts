/** 自定义手势和浮层使用游戏坐标；DOM 原生命中仍使用屏幕坐标。 */
export function getGameViewport(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.getElementById('game-viewport');
}

export function gameViewportSize() {
  const root = getGameViewport();
  return { width: root?.clientWidth ?? 375, height: root?.clientHeight ?? 667 };
}

export function gamePoint(point: { clientX: number; clientY: number }) {
  const root = getGameViewport();
  if (!root) return { x: point.clientX, y: point.clientY };
  const rect = root.getBoundingClientRect();
  return root.dataset.rotated === 'true'
    ? { x: point.clientY - rect.top, y: rect.right - point.clientX }
    : { x: point.clientX - rect.left, y: point.clientY - rect.top };
}

export function gameRect(element: Element): DOMRect {
  const rect = element.getBoundingClientRect();
  const a = gamePoint({ clientX: rect.left, clientY: rect.top });
  const b = gamePoint({ clientX: rect.right, clientY: rect.bottom });
  return new DOMRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
}
