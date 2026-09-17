import { gameRect } from '@/platform/displayCoordinates';
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ItemIcon } from './ItemIcon';

export type CompanionReward = { id: number; kind: ResourceKind; x: number; y: number };

/** 库存已由房主结算；仅复用任务奖励的轻量飞入背包动画。 */
export function CompanionRewardFlight({ reward, containerRef, visible }: {
  reward: CompanionReward | null; containerRef: RefObject<HTMLDivElement | null>; visible: boolean;
}) {
  const [flight, setFlight] = useState<{ reward: CompanionReward; style: CSSProperties } | null>(null);
  const seen = useRef<number | null>(null);
  useEffect(() => {
    const previous = seen.current;
    seen.current = reward?.id ?? null;
    if (!reward || !visible) { setFlight(null); return; }
    if (previous === reward.id) return;
    const container = containerRef.current;
    const target = container?.querySelector('.hud-backpack');
    if (!container || !target) return;
    const bounds = gameRect(container), rect = gameRect(target);
    const dx = rect.left + rect.width / 2 - bounds.left - reward.x;
    const dy = rect.top + rect.height / 2 - bounds.top - reward.y;
    setFlight({ reward, style: { left: reward.x, top: reward.y, '--flight-x': `${dx}px`, '--flight-y': `${dy}px`,
      '--flight-mid-x': `${dx * .4}px`, '--flight-mid-y': `${dy * .3 - 38}px` } as CSSProperties });
    const timer = window.setTimeout(() => setFlight(null), 1100);
    return () => window.clearTimeout(timer);
  }, [reward, containerRef, visible]);
  return <div className="quest-reward-flights" aria-hidden="true">{flight && <span key={flight.reward.id} className="quest-reward-flight" style={flight.style}>
    <ItemIcon kind={flight.reward.kind} size={26} />
  </span>}</div>;
}
