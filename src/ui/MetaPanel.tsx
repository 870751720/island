'use client';

import { useState } from 'react';
import { MetaProgress } from '@/game/meta/MetaProgress';
import { META_COSTS, META_TREE, type MetaNodeId } from '@/game/meta/MetaTree';

/**
 * 荒岛传承面板:局外养成的主界面,从开始界面进入。
 * 三分支九节点,每节点三级,用求生心得逐级领悟;只在开始界面出现,不影响局内 HUD。
 */
export function MetaPanel({ onClose }: { onClose: () => void }) {
  const [points, setPoints] = useState(() => MetaProgress.points());
  const [levels, setLevels] = useState<Record<MetaNodeId, number>>(() => {
    const map = {} as Record<MetaNodeId, number>;
    for (const branch of META_TREE) {
      for (const node of branch.nodes) map[node.id] = MetaProgress.level(node.id);
    }
    return map;
  });
  const [toast, setToast] = useState<string | null>(null);

  const upgrade = (id: MetaNodeId, name: string) => {
    if (!MetaProgress.upgrade(id)) return;
    setPoints(MetaProgress.points());
    setLevels((prev) => ({ ...prev, [id]: prev[id] + 1 }));
    setToast(`领悟了「${name}」`);
    window.setTimeout(() => setToast(null), 1600);
  };

  const allMaxed = META_TREE.every((branch) => branch.nodes.every((node) => levels[node.id] >= 3));

  return (
    <div className="meta-panel">
      <style>{css}</style>
      <div className="meta-head">
        <button className="meta-back" onClick={onClose} aria-label="返回">
          ‹ 返回
        </button>
        <div className="meta-title-wrap">
          <h2 className="meta-title">荒岛传承</h2>
          <p className="meta-motto">{allMaxed ? '传承圆满 · 岛已记住你的一切' : '每一次倒下,都让下一次活得更久'}</p>
        </div>
        <div className="meta-points">
          <span className="meta-points-num">{points}</span>
          <span className="meta-points-label">求生心得</span>
        </div>
      </div>

      <div className="meta-body">
        {META_TREE.map((branch) => (
          <section className="meta-branch" key={branch.id}>
            <header className="meta-branch-head">
              <span className="meta-branch-icon">{branch.icon}</span>
              <div>
                <h3 className="meta-branch-name">{branch.name}</h3>
                <p className="meta-branch-motto">{branch.motto}</p>
              </div>
            </header>
            {branch.nodes.map((node) => {
              const level = levels[node.id];
              const maxed = level >= 3;
              const cost = maxed ? 0 : META_COSTS[level];
              const affordable = !maxed && points >= cost;
              return (
                <div className="meta-node" key={node.id}>
                  <div className="meta-node-head">
                    <span className="meta-node-name">{node.name}</span>
                    <span className="meta-node-dots">
                      {[0, 1, 2].map((i) => (
                        <i key={i} className={i < level ? 'dot on' : 'dot'} />
                      ))}
                    </span>
                    {maxed && <span className="meta-node-badge">圆满</span>}
                  </div>
                  <ul className="meta-levels">
                    {node.levels.map((desc, i) => (
                      <li key={i} className={i < level ? 'got' : ''}>
                        <span className="meta-level-tag">{['壹', '贰', '叁'][i]}</span>
                        {desc}
                      </li>
                    ))}
                  </ul>
                  {maxed ? (
                    <div className="meta-buy done">已圆满</div>
                  ) : (
                    <button
                      className={affordable ? 'meta-buy' : 'meta-buy locked'}
                      disabled={!affordable}
                      onClick={() => upgrade(node.id, node.name)}
                    >
                      {affordable ? `领悟 · 消耗 ${cost} 心得` : `还差 ${cost - points} 心得`}
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        ))}
        <p className="meta-foot-hint">生存超过 2 天的每一局,都会按天数沉淀求生心得</p>
      </div>
      {toast && <div className="meta-toast">{toast}</div>}
    </div>
  );
}

const css = `
.meta-panel {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  background: linear-gradient(#16311f 0%, #1e4230 55%, #234a35 100%);
  font-family: sans-serif;
  color: #e9f2e9;
  animation: meta-in 0.35s ease-out;
}
@keyframes meta-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.meta-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: clamp(10px, 3vw, 16px) clamp(12px, 4vw, 20px);
  border-bottom: 1px solid rgba(255,255,255,0.12);
}
.meta-back {
  min-width: 64px;
  min-height: 44px;
  border: 1.5px solid rgba(255,255,255,0.25);
  border-radius: 12px;
  background: rgba(255,255,255,0.08);
  color: #e9f2e9;
  font-size: 15px;
  cursor: pointer;
}
.meta-title-wrap { flex: 1; min-width: 0; }
.meta-title { margin: 0; font-size: clamp(18px, 5vw, 24px); letter-spacing: 0.12em; }
.meta-motto { margin: 2px 0 0; font-size: clamp(11px, 3vw, 13px); color: rgba(233,242,233,0.6); }
.meta-points {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(247,215,116,0.2), rgba(247,215,116,0.08));
  border: 1px solid rgba(247,215,116,0.4);
}
.meta-points-num { color: #f7d774; font-size: clamp(18px, 5vw, 22px); font-weight: 800; line-height: 1.1; }
.meta-points-label { font-size: 10px; color: rgba(247,215,116,0.75); letter-spacing: 0.15em; }
.meta-body {
  flex: 1;
  overflow-y: auto;
  padding: clamp(12px, 4vw, 20px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 4vw, 20px);
}
.meta-branch { display: flex; flex-direction: column; gap: 10px; }
.meta-branch-head { display: flex; align-items: center; gap: 10px; }
.meta-branch-icon { font-size: clamp(22px, 6vw, 28px); }
.meta-branch-name { margin: 0; font-size: clamp(15px, 4.2vw, 18px); letter-spacing: 0.08em; }
.meta-branch-motto { margin: 2px 0 0; font-size: clamp(11px, 3vw, 12px); color: rgba(233,242,233,0.55); }
.meta-node {
  padding: clamp(10px, 3vw, 14px);
  border-radius: 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
}
.meta-node-head { display: flex; align-items: center; gap: 8px; }
.meta-node-name { font-size: clamp(15px, 4vw, 17px); font-weight: 700; letter-spacing: 0.1em; }
.meta-node-dots { display: flex; gap: 4px; margin-left: auto; }
.meta-node-dots .dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(255,255,255,0.18);
}
.meta-node-dots .dot.on { background: #f7d774; box-shadow: 0 0 6px rgba(247,215,116,0.6); }
.meta-node-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(247,215,116,0.18);
  border: 1px solid rgba(247,215,116,0.45);
  color: #f7d774;
  font-size: 11px;
}
.meta-levels { list-style: none; margin: 8px 0 10px; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.meta-levels li {
  display: flex; align-items: baseline; gap: 8px;
  font-size: clamp(12px, 3.4vw, 14px);
  color: rgba(233,242,233,0.55);
}
.meta-levels li.got { color: #dceccb; }
.meta-level-tag {
  flex: none;
  width: 20px; height: 20px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  font-size: 11px;
  transform: translateY(3px);
}
.meta-levels li.got .meta-level-tag { background: rgba(122,180,96,0.35); color: #cfe8bd; }
.meta-buy {
  width: 100%;
  min-height: 44px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(#8cc26a, #6faf4e);
  color: #12240e;
  font-size: clamp(14px, 3.8vw, 15px);
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
}
.meta-buy:active { transform: translateY(2px); }
.meta-buy.locked {
  background: rgba(255,255,255,0.08);
  color: rgba(233,242,233,0.45);
  cursor: default;
}
.meta-buy.done {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(247,215,116,0.12);
  color: rgba(247,215,116,0.7);
  cursor: default;
  min-height: 36px;
}
.meta-foot-hint { margin: 4px 0 8px; text-align: center; font-size: clamp(11px, 3vw, 12px); color: rgba(233,242,233,0.4); }
.meta-toast {
  position: absolute;
  left: 50%;
  bottom: 10%;
  transform: translateX(-50%);
  padding: 10px 22px;
  border-radius: 999px;
  background: rgba(18,36,14,0.92);
  border: 1px solid rgba(247,215,116,0.5);
  color: #f7d774;
  font-size: 14px;
  letter-spacing: 0.08em;
  animation: meta-toast-in 0.25s ease-out;
  pointer-events: none;
}
@keyframes meta-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
`;
