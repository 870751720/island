'use client';
import { forwardRef } from 'react';
import type { QuestView } from '@/game/quests/QuestDefinitions';

/** 位置复用角色自言自语的逐帧投影；动效只作用于内层，不影响跟随。 */
export const QuestFeedback = forwardRef<HTMLDivElement, { quest?: QuestView | null }>(function QuestFeedback({ quest }, ref) {
  const completed = quest?.enabled ? quest.feedback?.completed : undefined;
  return <div ref={ref} className="quest-feedback-anchor">
    {!!completed?.length && <div key={completed.join('|')} className="quest-feedback" role="status"><strong>任务完成</strong></div>}
  </div>;
});
