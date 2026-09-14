'use client';
import type { QuestView } from '@/game/quests/QuestDefinitions';
import { QUESTS } from '@/game/quests/QuestDefinitions';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { ItemIcon } from './ItemIcon';

export function QuestPanel({ quest }: { quest?: QuestView | null }) {
  if (!quest?.enabled || (quest.finished && !quest.celebration && !quest.feedback && !quest.pending)) return null;
  const current = QUESTS[quest.active];
  const feedback = quest.feedback;
  return <section className="quest-card" aria-label="荒岛起步任务">
    <div className="quest-caption"><span>荒岛起步</span><span>{quest.finished ? '全部完成' : `${quest.active + 1} / ${QUESTS.length}`}</span></div>
    <div className="quest-heading"><strong>{quest.finished ? '整装出发！' : current?.title}</strong><span className="quest-status">{quest.finished ? '已完成' : quest.busy ? '制作中' : '进行中'}</span></div>
    {!quest.finished && <>
      <div className="quest-progress">{quest.rows.map((row, i) => {
        const complete = row.have >= row.need;
        return <div className={`quest-row${complete ? ' is-complete' : ''}`} key={`${quest.active}-${i}`}>
          <div className="quest-row-label"><span>{row.label}</span><strong>{row.have} / {row.need}</strong></div>
          <div className="quest-row-bottom"><span className="quest-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, row.need > 0 ? row.have / row.need * 100 : 100)}%` }} /></span><span>{complete ? '✓ 已完成' : `还差 ${row.need - row.have}`}</span></div>
        </div>;
      })}</div>
      <div className="quest-hint">{quest.navigationHint ?? quest.hint}</div>
      {current && <div className="quest-reward"><span>完成奖励</span>{Object.entries(current.reward).map(([kind, n]) => <span key={kind} title={ITEMS[kind as ResourceKind].name}><ItemIcon kind={kind as ResourceKind} size={15} />×{n}</span>)}</div>}
    </>}
    {feedback && <div key={feedback.id} className="quest-feedback" role="status">
      {feedback.completed.length > 0 && <strong>✓ {feedback.completed.length === 1 ? `${feedback.completed[0]}完成` : `完成 ${feedback.completed.length} 项任务`}</strong>}
      {Object.keys(feedback.rewards).length > 0 && <div className="quest-received"><span>奖励已到账</span>{Object.entries(feedback.rewards).map(([kind, n]) => <span key={kind}><ItemIcon kind={kind as ResourceKind} size={16} />{ITEMS[kind as ResourceKind].name} +{n}</span>)}</div>}
    </div>}
    {quest.pending && <div className="quest-pending">奖励待发：背包腾出空间后自动到账</div>}
  </section>;
}
