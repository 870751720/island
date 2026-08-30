'use client';

import { useState } from 'react';
import { StartScreen, type StartMode } from './StartScreen';
import { GameplayUI } from './GameplayUI';
import { SaveSystem } from '@/game/systems/SaveSystem';

/** 阶段路由:开始界面与游戏进行中(含死亡弹窗)的切换。 */
export function GameCanvas() {
  const [playing, setPlaying] = useState(false);

  const start = (mode: StartMode) => {
    if (mode === 'new') SaveSystem.clear();
    setPlaying(true);
  };

  return playing ? (
    <GameplayUI onExit={() => setPlaying(false)} />
  ) : (
    <StartScreen onStart={start} />
  );
}
