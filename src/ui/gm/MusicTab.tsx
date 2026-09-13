import { gameTheme, gameButtonStyle } from '../gameTheme';
import { useEffect, useState } from 'react';
import type { Game } from '@/game/Game';
import { MUSIC_GROUP_LABELS, MUSIC_PIECES } from '@/game/audio/MusicLibrary';
import type { MusicGroup } from '@/game/audio/MusicPieces';

export function MusicTab({ getGame }: { getGame: () => Game | null }) {
  const [status, setStatus] = useState(() => getGame()?.getMusicStatus());
  useEffect(() => {
    const timer = setInterval(() => setStatus(getGame()?.getMusicStatus()), 300);
    return () => clearInterval(timer);
  }, [getGame]);
  const select = (id: string | null) => {
    getGame()?.gmSelectMusic(id);
    setStatus(getGame()?.getMusicStatus());
  };
  return (
    <div style={{ color: gameTheme.ink, fontSize: 14 }}>
      <p aria-live="polite">当前曲目：{status?.title ?? '等待音频启动'}</p>
      <p style={{ fontSize: 12, lineHeight: 1.6 }}>选曲后立即从头播放并循环，仅自己听到。自动模式优先战斗，其次钓鱼，其余时间优先跟随风雨雪天气，再跟随季节。</p>
      <button onClick={() => select(null)} aria-pressed={!status?.selection}
        style={{ ...buttonStyle, background: !status?.selection ? gameTheme.selected : gameTheme.inset }}>
        自动 · 战斗 / 钓鱼 / 天气 / 季节
      </button>
      {(Object.keys(MUSIC_GROUP_LABELS) as MusicGroup[]).map((group) => (
        <div key={group}>
          <p style={{ marginBottom: 8, fontWeight: 600 }}>{MUSIC_GROUP_LABELS[group]}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {MUSIC_PIECES.filter((p) => p.group === group).map((piece) => (
              <button key={piece.name} onClick={() => select(piece.name)}
                aria-pressed={status?.selection === piece.name}
                style={{ ...buttonStyle, background: status?.selection === piece.name ? gameTheme.selected : gameTheme.inset }}>
                {piece.title}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const buttonStyle = {
  width: '100%', minHeight: 44, padding: '8px 6px', ...gameButtonStyle, borderRadius: 10,
  color: gameTheme.ink, fontSize: 14, cursor: 'pointer',
} as const;
