'use client';
import { useState } from 'react';
import { pressAction } from './pressAction';
import type { QuestView } from '@/game/quests/QuestDefinitions';
import { QUESTS } from '@/game/quests/QuestDefinitions';

export function QuestPanel({ quest, onNavigate }: { quest?: QuestView | null; onNavigate: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!quest?.enabled || (quest.finished && !quest.pending && !quest.feedback)) return null;
  const current = QUESTS[quest.active];
  const completed = quest.rows.filter(row => row.have >= row.need).length;
  const status = quest.finished ? '已完成' : quest.navigationActive ? '前往中' : quest.busy ? '制作中' : '进行中';
  return <div className={`quest-card${collapsed ? ' is-collapsed' : ''}`}>
    <button type="button" className="quest-navigate" {...pressAction(onNavigate)} disabled={quest.finished} aria-pressed={!!quest.navigationActive} aria-label={`${current?.title ?? '整装出发'}，${quest.navigationActive ? '停止自动移动' : '自动前往任务目标'}`} />
    <span className="quest-heading"><strong>{current?.title ?? '整装出发'}</strong></span>
    <button type="button" className="quest-toggle" {...pressAction(() => setCollapsed(value => !value))} aria-expanded={!collapsed} aria-label={`${collapsed ? '展开' : '折叠'}任务进度`}>{collapsed ? '＋' : '−'}</button>
    <span className="quest-caption"><span>{status}</span><span>{quest.finished ? '全部完成' : collapsed ? `${completed}/${quest.rows.length} 项` : `${quest.active + 1}/${QUESTS.length}`} </span></span>
    {!collapsed && !quest.finished && <>
      <span className="quest-progress">{quest.rows.map((row, i) => <span className={`quest-row${row.have >= row.need ? ' is-complete' : ''}`} key={i}>
        <span>{row.have >= row.need ? '✓ ' : ''}{row.label}</span><strong>{row.have}/{row.need}</strong>
      </span>)}</span>
      <span className="quest-hint">{quest.navigationHint ?? quest.hint}</span>
    </>}
    {quest.pending && <span className="quest-pending">{collapsed ? '奖励待发 · 背包满' : '背包满，奖励腾出空间后到账'}</span>}
  </div>;
}
