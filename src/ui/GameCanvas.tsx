'use client';

import { useEffect, useRef, useState } from 'react';
import { Game, type HudSnapshot } from '@/game/Game';
import { Hud } from './Hud';
import { VirtualJoystick } from './VirtualJoystick';
import { ActionButton } from './ActionButton';

const INITIAL_HUD: HudSnapshot = {
  hunger: 100,
  thirst: 100,
  health: 100,
  dead: false,
  wood: 0,
  stone: 0,
  berry: 0,
  prompt: null,
  clock: '12:00',
  isNight: false,
};

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const game = new Game(container, setHud);
    gameRef.current = game;
    game.start();
    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}
    >
      <Hud hud={hud} />
      {!hud.dead && (
        <>
          <VirtualJoystick
            onChange={(x, z) => gameRef.current?.setJoystick(x, z)}
          />
          {hud.prompt && (
            <ActionButton
              label={hud.prompt}
              onPress={() => gameRef.current?.action()}
            />
          )}
        </>
      )}
    </div>
  );
}
