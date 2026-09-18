'use client';

import type { GmActions } from './GmPanel';
import { ActionButton } from './controls';
import { gameTheme } from '../gameTheme';

export function HusbandryTab({ actions }: { actions: GmActions }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: gameTheme.ink }}>
    <ActionButton label="领取驯养礼包：套索、胡萝卜、烤兽肉各 ×500" tone="primary" onClick={() => {
      actions.giveItem('lasso', 500); actions.giveItem('carrot', 500); actions.giveItem('cookedGameMeat', 500);
    }} />
    <ActionButton label="狼熊挣脱均设 0%：稳定测试驯养" onClick={() => actions.setConfig({ wolfEscapeChance: 0, bearEscapeChance: 0 })} />
    <ActionButton label="均设 100%：下一次挣扎必脱" onClick={() => actions.setConfig({ wolfEscapeChance: 1, bearEscapeChance: 1 })} />
    <ActionButton label="衰减 ×60：满心 30 秒耗尽" onClick={() => actions.setConfig({ husbandryDecaySpeed: 60 })} />
    <ActionButton label="生产 ×60：每 10 秒成熟" onClick={() => actions.setConfig({ husbandryProductionSpeed: 60 })} />
    <ActionButton label="恢复驯养 GM 默认值" onClick={() => actions.setConfig({ wolfEscapeChance: 0.95, bearEscapeChance: 0.99, husbandryDecaySpeed: 1, husbandryProductionSpeed: 1 })} />
  </div>;
}
