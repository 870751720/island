'use client';
import { useState } from 'react';
import type { QuestView } from '@/game/quests/QuestDefinitions';
import { QUESTS } from '@/game/quests/QuestDefinitions';

export function QuestPanel({ quest }: { quest?: QuestView | null }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!quest?.enabled || (quest.finished && !quest.pending && !quest.feedback)) return null;
  const current = QUESTS[quest.active];
  const completed = quest.rows.filter(row => row.have >= row.need).length;
  const status = quest.finished ? '已完成' : quest.busy ? '制作中' : '进行中';
  return <button type="button" className={`quest-card${collapsed ? ' is-collapsed' : ''}`} onClick={() => setCollapsed(value => !value)} aria-expanded={!collapsed} aria-label={`${current?.title ?? '整装出发'}，${collapsed ? '展开' : '折叠'}任务进度`}>
    <span className="quest-heading"><strong>{current?.title ?? '整装出发'}</strong><span className="quest-toggle" aria-hidden="true">{collapsed ? '＋' : '−'}</span></span>
    <span className="quest-caption"><span>{status}</span><span>{quest.finished ? '全部完成' : collapsed ? `${completed}/${quest.rows.length} 项` : `${quest.active + 1}/${QUESTS.length}`} </span></span>
    {!collapsed && !quest.finished && <>
      <span className="quest-progress">{quest.rows.map((row, i) => <span className={`quest-row${row.have >= row.need ? ' is-complete' : ''}`} key={i}>
        <span>{row.have >= row.need ? '✓ ' : ''}{row.label}</span><strong>{row.have}/{row.need}</strong>
      </span>)}</span>
      <span className="quest-hint">{quest.navigationHint ?? quest.hint}</span>
    </>}
    {quest.pending && <span className="quest-pending">{collapsed ? '奖励待发 · 背包满' : '背包满，奖励腾出空间后到账'}</span>}
  </button>;
}
