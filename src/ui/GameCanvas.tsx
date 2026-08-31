'use client';

import { useState } from 'react';
import { StartScreen, type StartMode, type MultiplayerRole } from './StartScreen';
import { RoomLobby } from './RoomLobby';
import { GameplayUI } from './GameplayUI';
import { SaveSystem } from '@/game/systems/SaveSystem';
import { NetHost } from '@/game/net/NetHost';
import { NetGuest } from '@/game/net/NetGuest';

type Phase = 'start' | 'host' | 'guest' | 'playing';

/** 阶段路由:开始界面 / 联机大厅 / 游戏进行中(含死亡弹窗)的切换。 */
export function GameCanvas() {
  const [phase, setPhase] = useState<Phase>('start');
  const [host, setHost] = useState<NetHost | null>(null);
  const [guest, setGuest] = useState<NetGuest | null>(null);

  const start = (mode: StartMode) => {
    if (mode === 'new') SaveSystem.clear();
    setPhase('playing');
  };

  const exit = () => {
    // 退出时一并断开联机会话(房主与客人都会回到开始界面)
    host?.dispose();
    guest?.dispose();
    setHost(null);
    setGuest(null);
    setPhase('start');
  };

  if (phase === 'playing') {
    return <GameplayUI net={{ host: host ?? undefined, guest: guest ?? undefined }} onExit={exit} />;
  }
  if (phase === 'host') {
    return (
      <RoomLobby
        mode="host"
        onBegin={(net) => {
          setHost(net as NetHost);
          setPhase('playing');
        }}
        onBack={() => setPhase('start')}
      />
    );
  }
  if (phase === 'guest') {
    return (
      <RoomLobby
        mode="guest"
        onBegin={(net) => {
          setGuest(net as NetGuest);
          setPhase('playing');
        }}
        onBack={() => setPhase('start')}
      />
    );
  }
  return (
    <StartScreen
      onStart={start}
      onMultiplayer={(role: MultiplayerRole) => setPhase(role)}
    />
  );
}
