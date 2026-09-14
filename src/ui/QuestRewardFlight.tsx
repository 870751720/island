'use client';
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { QuestView } from '@/game/quests/QuestDefinitions';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ItemIcon } from './ItemIcon';

type Flight = { id: string; kind: ResourceKind; style: CSSProperties };

/** 房主反馈窗口内的奖励为累计值，只表现本次新增到账；不参与库存结算。 */
export function QuestRewardFlight({ quest, visible, containerRef }: {
  quest?: QuestView | null;
  visible: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const previous = useRef<QuestView['feedback']>(undefined);
  const [flights, setFlights] = useState<Flight[]>([]);
  const feedback = quest?.feedback;
  useEffect(() => {
    const old = previous.current;
    previous.current = feedback;
    if (!visible || !quest?.enabled) { setFlights([]); return; }
    if (!feedback || feedback.id === old?.id) return;
    const container = containerRef.current;
    const source = container?.querySelector('.quest-card');
    const target = container?.querySelector('.hud-backpack');
    if (!container || !source || !target) return;
    const origin = source.getBoundingClientRect();
    const destination = target.getBoundingClientRect();
    const bounds = container.getBoundingClientRect();
    const x = origin.left + origin.width / 2 - bounds.left;
    const y = origin.top + origin.height / 2 - bounds.top;
    const dx = destination.left + destination.width / 2 - bounds.left - x;
    const dy = destination.top + destination.height / 2 - bounds.top - y;
    const batch: Flight[] = [];
    for (const [kind, count] of Object.entries(feedback.rewards)) {
      const resource = kind as ResourceKind;
      const added = count - (old?.rewards[resource] ?? 0);
      // 每种最多三个小模型，避免一次发奖占满手机屏幕。
      for (let i = 0; i < Math.min(3, added); i++) {
        const index = batch.length;
        batch.push({ id: `${feedback.id}-${kind}-${i}`, kind: resource, style: {
          left: x, top: y,
          '--flight-x': `${dx}px`, '--flight-y': `${dy}px`,
          '--flight-mid-x': `${dx * .4}px`, '--flight-mid-y': `${dy * .3 - 38}px`,
          animationDelay: `${index * 65}ms`,
        } as CSSProperties });
      }
    }
    setFlights(current => [...current, ...batch].slice(-18));
  }, [feedback, visible, quest?.enabled, containerRef]);

  return <div className="quest-reward-flights" aria-hidden="true">
    {flights.map(flight => <span key={flight.id} className="quest-reward-flight" style={flight.style} onAnimationEnd={() => {
      setFlights(current => current.filter(item => item.id !== flight.id));
      const target = containerRef.current?.querySelector('.hud-backpack');
      if (target && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        target.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.3)' }, { filter: 'brightness(1)' }], { duration: 260 });
      }
    }}><ItemIcon kind={flight.kind} size={26} /></span>)}
  </div>;
}
