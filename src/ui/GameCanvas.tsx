'use client';

import { useEffect, useRef, useState } from 'react';
import { Game, type HudSnapshot } from '@/game/Game';
import { Hud } from './Hud';

const INITIAL_HUD: HudSnapshot = {
  hunger: 100,
  thirst: 100,
  health: 100,
  dead: false,
  wood: 0,
  stone: 0,
  berry: 0,
  prompt: null,
};

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const game = new Game(container, setHud);
    game.start();
    return () => game.dispose();
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Hud hud={hud} />
    </div>
  );
}
