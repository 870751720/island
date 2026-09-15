'use client';

import type { Game } from '@/game/Game';
import type { MapSnapshot } from '@/game/GameContracts';
import { useEffect, useState, type RefObject } from 'react';

/** 管理小地图开关，并为简图和展开地图低频读取 Game 的表现快照。 */
export function useMapSnapshot(gameRef: RefObject<Game | null>, multiplayer = false) {
  const [mapOpen, setMapOpen] = useState(multiplayer);
  const [mapSnapshot, setMapSnapshot] = useState<MapSnapshot | null>(null);

  useEffect(() => {
    if (multiplayer) setMapOpen(true);
  }, [multiplayer]);

  useEffect(() => {
    const update = () => {
      const snapshot = gameRef.current?.getMapSnapshot();
      if (snapshot) setMapSnapshot(snapshot);
    };
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [gameRef]);

  return {
    mapOpen,
    mapSnapshot,
    openMap: () => setMapOpen(true),
    closeMap: () => setMapOpen(false),
  };
}
