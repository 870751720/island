'use client';

import { useEffect, useState } from 'react';
import { ArrivalDiagnosticPanel } from './ArrivalDiagnosticPanel';
import { IslandScene } from './IslandScene';
import { MenuIcon } from './MenuIcon';
import { islandArrivalCss } from './arrivalStyles';

const tips = [
  ['迈出第一步', '左侧摇杆移动，右侧按钮采集与交互。'],
  ['看看背包', '收集到的物资会放进背包，记得查看。'],
  ['认识小岛', '点开右上角地图，看看自己身在何处。'],
];

/** 与主菜单共享插画和主题，只呈现本地世界初始化状态。 */
export function IslandArrival({ ready, multiplayer }: { ready: boolean; multiplayer: boolean }) {
  const [visible, setVisible] = useState(true);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setVisible(false), 600);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (!visible) return null;
  return (
    <div className="island-arrival" data-ready={ready} aria-label="登岛准备">
      <style>{islandArrivalCss}</style>
      <div className="arrival-layout">
        <div className="arrival-heading">
          <div className="arrival-brand"><MenuIcon name="compass" /> 荒岛求生</div>
          <IslandScene paused={ready} />
          <p className="arrival-caption">海风正好，小岛在等你</p>
        </div>
        <div className="arrival-panel">
          <div className="arrival-kicker">{multiplayer ? '结伴登岛' : '小岛之旅'}</div>
          <div role="status" aria-live="polite" aria-atomic="true">
            <h1>{ready ? '小岛已就绪' : '正在登上小岛…'}</h1>
            <p className="arrival-description">{ready ? '带上好奇心，出发吧' : '正在准备岛屿与营地，请稍候'}</p>
          </div>
          <div className="arrival-track" aria-hidden="true"><span /></div>
          <div className="arrival-tip" key={tip}>
            <strong>{tips[tip][0]}</strong>
            <p>{tips[tip][1]}</p>
          </div>
          <button type="button" className="arrival-next" disabled={ready} onClick={() => setTip((tip + 1) % tips.length)}>
            <span>换个小提示</span><span className="arrival-count">{tip + 1} / {tips.length}</span><MenuIcon name="arrow" />
          </button>
          {!ready && <ArrivalDiagnosticPanel />}
        </div>
      </div>
    </div>
  );
}
