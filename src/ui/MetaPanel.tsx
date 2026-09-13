'use client';

import { useState } from 'react';
import { ItemIcon } from './ItemIcon';
import { MenuIcon } from './start/MenuIcon';
import { MetaProgress } from '@/game/meta/MetaProgress';
import { META_COSTS, META_MAX_LEVEL, META_TREE, metaPrerequisite, metaUnlocked, type MetaNodeId } from '@/game/meta/MetaTree';
import { metaPanelCss } from './meta/styles';

function readLevels() {
  return Object.fromEntries(META_TREE.flatMap((branch) => branch.nodes.map((node) => [node.id, MetaProgress.level(node.id)]))) as Record<MetaNodeId, number>;
}

export function MetaPanel({ onClose }: { onClose: () => void }) {
  const [points, setPoints] = useState(() => MetaProgress.points());
  const [levels, setLevels] = useState(readLevels);
  const [selected, setSelected] = useState<MetaNodeId>('gleaning');
  const [notice, setNotice] = useState('点击天赋查看效果，再消耗心得领悟');
  const levelOf = (id: MetaNodeId) => levels[id];
  const branch = META_TREE.find((entry) => entry.nodes.some((node) => node.id === selected))!;
  const node = branch.nodes.find((entry) => entry.id === selected)!;
  const level = levels[selected];
  const maxed = level >= META_MAX_LEVEL;
  const unlocked = metaUnlocked(selected, levelOf);
  const prerequisite = metaPrerequisite(selected);
  const cost = maxed ? 0 : META_COSTS[level];
  const learned = Object.values(levels).reduce((sum, value) => sum + value, 0);

  const upgrade = () => {
    if (!MetaProgress.upgrade(selected)) return;
    setPoints(MetaProgress.points());
    setLevels(readLevels());
    setNotice(`已领悟「${node.name}」${level + 1} 级`);
  };

  return (
    <div className="meta-panel" role="dialog" aria-modal="true" aria-labelledby="meta-title">
      <style>{metaPanelCss}</style>
      <header className="meta-head">
        <button className="meta-back" onClick={onClose} autoFocus>‹ 返回</button>
        <div><p className="meta-eyebrow">把经验，留给下一次出发</p><h2 id="meta-title">荒岛传承</h2></div>
        <div className="meta-points"><strong>{points}</strong><span>求生心得</span></div>
      </header>
      <div className="meta-content">
        <section className="meta-map" aria-label="传承天赋树">
          <div className="meta-root"><MenuIcon name="compass" /><strong>求生之根</strong><span>已领悟 {learned} / {META_TREE.length * 3 * META_MAX_LEVEL} 级</span></div>
          <div className="meta-branches">
            {META_TREE.map((entry) => (
              <section className="meta-branch" key={entry.id} aria-label={entry.name}>
                <h3><ItemIcon kind={entry.icon} size={24} /><span>{entry.name.split(' · ')[0]}</span><small>{entry.name.split(' · ')[1]}</small></h3>
                {entry.nodes.map((talent) => {
                  const rank = levels[talent.id];
                  const open = metaUnlocked(talent.id, levelOf);
                  const full = rank >= META_MAX_LEVEL;
                  const available = open && !full && points >= META_COSTS[rank];
                  return <div className={`meta-path${rank > 0 ? ' learned' : ''}`} key={talent.id}>
                    <button className={`meta-talent${selected === talent.id ? ' selected' : ''}${!open ? ' locked' : ''}${rank > 0 ? ' learned' : ''}`}
                      aria-pressed={selected === talent.id} aria-controls="meta-detail" aria-label={`${talent.name}，${rank} 级，${!open ? '未解锁' : full ? '已圆满' : available ? '可领悟' : '心得不足'}`}
                      onClick={() => setSelected(talent.id)}>
                      <strong>{talent.name}</strong>
                      <span className="meta-ranks" aria-hidden="true">{[1, 2, 3].map((value) => <i key={value} className={value <= rank ? 'on' : ''} />)}</span>
                      <small>{!open ? '待解锁' : full ? '已圆满' : available ? '可领悟' : `${rank} / ${META_MAX_LEVEL} 级`}</small>
                    </button>
                  </div>;
                })}
              </section>
            ))}
          </div>
          <p className="meta-hint">沿枝成长 · 前置天赋 1 级解锁下一层</p>
        </section>
        <section className="meta-detail" id="meta-detail" aria-label={`${node.name}天赋详情`}>
          <p className="meta-eyebrow">{branch.name} · {branch.motto}</p>
          <div className="meta-detail-title"><h3>{node.name}</h3><span>{level} / {META_MAX_LEVEL} 级</span></div>
          <ol className="meta-effects">{node.levels.map((effect, index) => <li className={index < level ? 'learned' : index === level ? 'next' : ''} key={effect}><span>{index + 1}</span><div><small>{index < level ? '已领悟' : index === level ? '下一级' : '进阶效果'}</small>{effect}</div></li>)}</ol>
          <p className="meta-requirement">{!unlocked ? `先领悟「${prerequisite!.name}」1 级` : maxed ? '这份经验，已成为你的本能。' : `领悟下一等级消耗 ${cost} 心得${points < cost ? `，还差 ${cost - points}` : ''}`}</p>
          <button className="meta-buy" disabled={maxed || !unlocked || points < cost} onClick={upgrade}>{maxed ? '已圆满' : !unlocked ? '前置天赋未解锁' : points < cost ? '心得不足' : `领悟 · ${cost} 心得`}</button>
          <p className="meta-notice" role="status">{notice}</p>
        </section>
      </div>
      <footer className="meta-footer">生存超过 2 天，结算时获得天数 × 10 心得 · 加成仅单机生效</footer>
    </div>
  );
}
