import { ModeSelector } from './ModeSelector';
import { GAME_MODE_LABELS, type GameMode } from '@/game/GameMode';
import type { SaveData } from '@/game/systems/SaveSystem';
import { legacyPointsForDay } from '@/game/meta/MetaProgress';

export function NewGameDialog({ save, value, onChange, onConfirm, onCancel }: {
  save: SaveData | null;
  value: GameMode;
  onChange: (value: GameMode) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const points = save ? legacyPointsForDay(save.day, save.gameMode) : 0;
  return <div className="abandon-mask">
    <div className="abandon-panel" role="dialog" aria-modal="true" aria-labelledby="new-island-title"
      onKeyDown={event => { if (event.key === 'Escape') onCancel(); }}>
      <h3 className="abandon-title" id="new-island-title">开启一座新的岛</h3>
      <ModeSelector value={value} onChange={onChange} />
      <p className="abandon-text" aria-live="polite">{value === 'leisure'
        ? '死亡后可复活，会掉落部分随身物品；无法获得荒岛传承点。'
        : '沿用原有求生规则，本局结束后可按生存天数获得荒岛传承点。'}<br />开局后无法切换模式。</p>
      {save && <p className="abandon-text">原岛已生存 {save.day ?? 1} 天，岛上的进度与物品将被替换。<br />
        {points > 0 ? `原求生存档将结算 ${points} 荒岛传承点。` : '原存档本次不结算荒岛传承点。'}</p>}
      <div className="abandon-actions">
        <button autoFocus className="abandon-cancel" onClick={onCancel}>再想想</button>
        <button className="abandon-confirm" data-ui-sound="manual" onClick={onConfirm}>以{GAME_MODE_LABELS[value]}开始</button>
      </div>
    </div>
  </div>;
}
