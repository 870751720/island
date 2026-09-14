'use client';
import { forwardRef } from 'react';
import type { QuestView } from '@/game/quests/QuestDefinitions';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { ItemIcon } from './ItemIcon';

/** 位置复用角色自言自语的逐帧投影；动效只作用于内层，不影响跟随。 */
export const QuestFeedback = forwardRef<HTMLDivElement, { quest?: QuestView | null }>(function QuestFeedback({ quest }, ref) {
  const feedback = quest?.enabled ? quest.feedback : undefined;
  return <div ref={ref} className="quest-feedback-anchor">
    {feedback && <div key={feedback.id} className="quest-feedback" role="status">
      {feedback.completed.length > 0 && <strong>✓ {feedback.completed.length === 1 ? '任务完成' : `完成 ${feedback.completed.length} 项任务`}</strong>}
      {feedback.completed.length === 1 && <span className="quest-feedback-title">{feedback.completed[0]}</span>}
      {Object.keys(feedback.rewards).length > 0 && <div className="quest-received"><span>奖励到账</span>{Object.entries(feedback.rewards).map(([kind, n]) => <span key={kind}><ItemIcon kind={kind as ResourceKind} size={14} />{ITEMS[kind as ResourceKind].name} +{n}</span>)}</div>}
      {quest?.pending && <span className="quest-feedback-title">剩余奖励待背包腾出空间后到账</span>}
    </div>}
  </div>;
});
