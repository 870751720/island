'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/GameContracts';
import type { ResourceKind } from '@/game/systems/Inventory';
import { HIDDEN_RECIPES, RESEARCH_INGREDIENTS, matchResearch } from '@/game/systems/HiddenRecipes';
import { ITEMS } from '@/game/systems/Items';
import { ItemIcon } from './ItemIcon';
import { itemCount } from './inventorySnapshot';
import { gamePanelStyle, gameButtonStyle } from './gameTheme';
import styles from './ResearchTablePanel.module.css';

export function ResearchTablePanel({ hud, onStart, onClose }: { hud: HudSnapshot; onStart: (kinds: ResourceKind[]) => boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'try' | 'known'>('try');
  const [selected, setSelected] = useState<ResourceKind[]>([]);
  const [clueIndex, setClueIndex] = useState(0);
  const [moreHint, setMoreHint] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const research = hud.research;
  const running = research.remaining > 0;
  const known = HIDDEN_RECIPES.filter(r => hud.discoveredRecipes.includes(r.kind));
  const unknown = HIDDEN_RECIPES.filter(r => !hud.discoveredRecipes.includes(r.kind));
  const clue = unknown[clueIndex % Math.max(1, unknown.length)];
  const matching = matchResearch(selected);
  const alreadyKnown = matching && hud.discoveredRecipes.includes(matching.kind);
  const count = (kind: ResourceKind) => itemCount(hud.slots, kind);
  const missing = selected.some(k => count(k) < 1);
  useEffect(() => { if (running) { setPending(false); setSelected([]); setError(''); } }, [running, research.serial]);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => { setPending(false); setError('尚未开始，请检查食材或连接后重试'); }, 3500);
    return () => clearTimeout(timer);
  }, [pending]);
  const materials = (cost: Partial<Record<ResourceKind, number>>) => Object.entries(cost).map(([k, n]) => {
    const kind = k as ResourceKind;
    return <span key={kind} className={styles.material}><ItemIcon kind={kind} size={20} />{ITEMS[kind].name} ×{n}<small>持有 {count(kind)}</small></span>;
  });
  return <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label="料理研究台" style={gamePanelStyle} className={styles.panel}>
      <header className={styles.header}><strong><ItemIcon kind="researchTable" size={26} /> 料理研究台</strong><button style={gameButtonStyle} onClick={onClose} aria-label="关闭料理研究台">×</button></header>
      <nav className={styles.tabs}><button style={gameButtonStyle} aria-pressed={tab === 'try'} onClick={() => setTab('try')}>尝试料理</button><button style={gameButtonStyle} aria-pressed={tab === 'known'} onClick={() => setTab('known')}>已发现 · {known.length}/{HIDDEN_RECIPES.length}</button></nav>
      {tab === 'known' ? <div className={styles.cards}>
        {known.length === 0 && <p>还没有发现新料理，跟着线索尝试一组食材吧。</p>}
        {[...known].sort((a, b) => Number(b.kind === research.result) - Number(a.kind === research.result)).map(r => <article className={styles.card} key={r.kind}>
          <h3><ItemIcon kind={r.kind} size={32} /> {ITEMS[r.kind].name} {research.result === r.kind && <small>新</small>}</h3>
          <p>发现时的搭配 · 每种一份</p><div className={styles.materials}>{materials(Object.fromEntries(r.research.map(k => [k, 1])))}</div>
          <p>烹饪所需 · 每份成品</p><div className={styles.materials}>{materials(r.cost)}</div><p>前往烹饪台，添柴后在「烹饪」中制作。</p>
        </article>)}
        {unknown.length > 0 && <p>还有 {unknown.length} 道料理等待发现</p>}
      </div> : <>
        <div className={styles.card}>
          {clue ? <><div className={styles.header}><strong>研究线索</strong><button style={gameButtonStyle} disabled={unknown.length < 2} onClick={() => { setClueIndex(n => n + 1); setMoreHint(false); }}>换一条</button></div><p>{moreHint ? clue.hint : clue.clue}</p>{research.failures >= 2 && !moreHint && <button style={gameButtonStyle} onClick={() => setMoreHint(true)}>查看进一步提示</button>}</> : <><strong>当前料理已全部发现</strong><p>打开「已发现」查看搭配与烹饪用量。</p></>}
        </div>
        <div className={styles.slots} aria-label="食材槽位">
          {Array.from({ length: 4 }, (_, i) => {
            const kind = (running ? research.ingredients : selected)[i];
            return <button key={i} style={gameButtonStyle} disabled={running || pending || !kind} onClick={() => setSelected(s => s.filter(k => k !== kind))} aria-label={kind ? `移除${ITEMS[kind].name}` : '空食材槽'}>
              {kind ? <span className={running ? styles.bounce : ''} style={{ '--delay': `${i * -0.14}s` } as CSSProperties}><ItemIcon kind={kind} size={32} /><small>{ITEMS[kind].name} ×1</small></span> : <span>＋</span>}
            </button>;
          })}
        </div>
        {running && <div className={styles.progress} role="progressbar" aria-label="料理研究进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((1 - research.remaining / 2) * 100)}><div style={{ width: `${(1 - research.remaining / 2) * 100}%` }} /></div>}
        <div aria-live="polite" className={styles.result}>
          {running ? `正在尝试… ${research.remaining.toFixed(1)} 秒` : research.result === 'failed' ? '这次没有做成新料理，换个搭配试试。' : research.result ? <><ItemIcon kind={research.result} size={30} /> 发现新料理：{ITEMS[research.result].name}！<br />获得一份成品，已解锁烹饪配方。</> : '任选 1～4 种食材，每种一份，顺序不限。'}
        </div>
        {!running && research.result && research.result !== 'failed' && <button style={{ ...gameButtonStyle, width: '100%' }} onClick={() => setTab('known')}>查看新食谱与烹饪用量</button>}
        <p className={styles.caption}>从背包选择 · 点选加入，点上方食材撤回</p>
        <div className={styles.ingredients}>
          {RESEARCH_INGREDIENTS.filter(k => count(k) > 0).map(kind => <button style={gameButtonStyle} key={kind} aria-pressed={selected.includes(kind)} disabled={running || pending || selected.includes(kind) || selected.length >= 4} onClick={() => { setError(''); setSelected(s => s.includes(kind) || s.length >= 4 ? s : [...s, kind]); }}><ItemIcon kind={kind} size={26} /><span>{ITEMS[kind].name}<small>持有 {count(kind)}</small></span></button>)}
        </div>
        {!RESEARCH_INGREDIENTS.some(k => count(k) > 0) && <p>背包里没有可投入的食材，先采集一些吧。</p>}
        <div className={styles.footer}>
          <p>{alreadyKnown ? `已发现：${ITEMS[matching!.kind].name}，可在烹饪台制作。` : '开始即消耗食材。成功获得一份成品；失败后等待 5 秒。'}{missing && ' 所选食材不足，请重新选择。'}</p>
          {error && <p role="alert">{error}</p>}
          <button style={gameButtonStyle} disabled={running || pending || research.cooldown > 0 || !selected.length || missing || !!alreadyKnown || !unknown.length} onClick={() => { if (onStart(selected)) setPending(true); else setError('暂时无法研究，请确认在台旁且没有其他动作'); }}>
            {running ? '正在尝试…' : pending ? '等待开始…' : research.cooldown > 0 ? `整理台面中 · ${Math.ceil(research.cooldown)} 秒` : alreadyKnown ? '已发现此配方' : '尝试新料理'}
          </button>
        </div>
      </>}
    </section>
  </div>;
}
