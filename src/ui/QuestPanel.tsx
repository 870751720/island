'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { QuestView } from '@/game/quests/QuestDefinitions';
import { QUESTS } from '@/game/quests/QuestDefinitions';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { ItemIcon } from './ItemIcon';
import { gameTheme, gamePanelStyle, gameButtonStyle } from './gameTheme';

export function QuestPanel({ quest }: { quest?: QuestView | null }) {
  const [open, setOpen] = useState(false);
  if (!quest?.enabled || (quest.finished && !quest.celebration)) return null;
  const current = QUESTS[quest.active];
  return <>
    <button className="quest-card" onClick={() => setOpen(true)} aria-label="查看荒岛起步任务详情">
      <span className="quest-caption">荒岛起步 <span>{quest.finished ? '已完成' : `${quest.active + 1}/${QUESTS.length}`}</span></span>
      <strong>{quest.finished ? '整装出发！' : current.title}</strong>
      {!quest.finished && <><span className="quest-progress">{quest.rows.map((r, i) => <span key={i}>{r.have >= r.need ? '✓ ' : ''}{r.label} {r.have}/{r.need}</span>)}</span><span className="quest-hint">{quest.navigationHint ?? quest.hint}</span><span className="quest-reward">奖励 {Object.entries(current.reward).map(([kind, n]) => <span key={kind}><ItemIcon kind={kind as ResourceKind} size={15} />×{n}</span>)}</span></>}
      {quest.finished && <span className="quest-hint">皮制套装已备齐，自由探索吧！</span>}
    </button>
    {open && createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 250, background: gameTheme.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: gameTheme.font }} onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="荒岛起步任务" className="hud-panel-enter" style={{ ...gamePanelStyle, width: 'min(360px,calc(100vw - 32px))', maxHeight: '80dvh', overflowY: 'auto', padding: 18, color: gameTheme.ink }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><strong>荒岛起步</strong><button style={{ ...gameButtonStyle, minWidth: 44, minHeight: 44, background: gameTheme.inset, color: gameTheme.ink }} onClick={() => setOpen(false)}>关闭</button></div>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>{quest.navigationHint ?? quest.hint}</p>
        {quest.pending && <p style={{ fontSize: 12, color: gameTheme.accent }}>奖励已保留，背包腾出空间后自动发放。</p>}
        {QUESTS.map((q, i) => <div key={q.id} style={{ padding: '10px 8px', borderRadius: 10, marginBottom: 5, background: i === quest.active ? gameTheme.selected : gameTheme.inset, fontSize: 13 }}>
          <strong>{quest.done.includes(q.id) ? '✓' : `${i + 1}.`} {q.title}</strong>
          <div style={{ marginTop: 4, color: gameTheme.muted, lineHeight: 1.5 }}>{q.hint}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>{Object.entries(q.reward).map(([kind, n]) => <span key={kind}><ItemIcon kind={kind as ResourceKind} size={16} />{ITEMS[kind as ResourceKind].name}×{n}</span>)}</div>
        </div>)}
        <p style={{ fontSize: 12, color: gameTheme.muted }}>可提前完成任务。设置中可以关闭任务指引，进度会保留。</p>
      </section>
    </div>, document.body)}
  </>;
}
