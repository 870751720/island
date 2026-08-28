'use client';

import { useState } from 'react';
import { StartScreen } from './StartScreen';
import { GameplayUI } from './GameplayUI';

/** 阶段路由:开始界面与游戏进行中(含死亡弹窗)的切换。 */
export function GameCanvas() {
  const [playing, setPlaying] = useState(false);

  return playing ? (
    <GameplayUI onExit={() => setPlaying(false)} />
  ) : (
    <StartScreen onStart={() => setPlaying(true)} />
  );
}
