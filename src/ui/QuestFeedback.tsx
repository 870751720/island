'use client';
import { forwardRef, useEffect, useRef, useState } from 'react';
import type { QuestView } from '@/game/quests/QuestDefinitions';

/** 累计反馈按任务去重排队；播放时间独立于房主的反馈保留窗口。 */
export const QuestFeedback = forwardRef<HTMLDivElement, { quest?: QuestView | null; visible: boolean }>(function QuestFeedback({ quest, visible }, ref) {
  const seen = useRef(new Set<string>());
  const [queue, setQueue] = useState<string[]>([]);
  const feedback = quest?.feedback;
  useEffect(() => {
    const added = (feedback?.completed ?? []).filter(name => !seen.current.has(name));
    for (const name of added) seen.current.add(name);
    if (!visible || !quest?.enabled) { setQueue([]); return; }
    if (added.length) setQueue(current => [...current, ...added]);
  }, [feedback, quest?.enabled, visible]);
  const active = queue[0];
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setQueue(current => current.slice(1)), 1600);
    return () => window.clearTimeout(timer);
  }, [active]);
  return <div ref={ref} className="quest-feedback-anchor">
    {visible && quest?.enabled && active && <div key={active} className="quest-feedback" role="status">任务完成 <span aria-hidden="true">✓</span></div>}
  </div>;
});
