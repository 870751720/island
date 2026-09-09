'use client';

import { Game } from '@/game/Game';
import type { HudSnapshot, PickupToast } from '@/game/GameContracts';
import type { NetGuest } from '@/game/net/NetGuest';
import type { NetHost } from '@/game/net/NetHost';
import type { SaveData } from '@/game/systems/SaveSystem';
import { useEffect, useRef, useState } from 'react';
import { createInitialHudSnapshot } from './createInitialHudSnapshot';
import type { VitalWarnHandle } from './VitalWarn';

export interface PickupPop extends PickupToast {
  id: number;
}

export interface DamagePop {
  id: number;
  amount: number;
  x: number;
  y: number;
}

interface GameLifecycleOptions {
  net?: { host?: NetHost; guest?: NetGuest };
  initialSave?: SaveData | null;
}

/**
 * 衔接 React UI 与 Game 实例生命周期。
 * 世界构建保留双帧延迟，确保同步构造 Game 前加载遮罩已完成首帧绘制。
 */
export function useGameLifecycle({ net, initialSave }: GameLifecycleOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const mumbleRef = useRef<HTMLDivElement>(null);
  const dogEmojiRef = useRef<HTMLDivElement>(null);
  const vitalWarnRef = useRef<VitalWarnHandle>(null);
  const gameRef = useRef<Game | null>(null);
  const pickupIdRef = useRef(0);
  const damageIdRef = useRef(0);
  const [hud, setHud] = useState<HudSnapshot>(createInitialHudSnapshot);
  const [worldReady, setWorldReady] = useState(false);
  const [pickups, setPickups] = useState<PickupPop[]>([]);
  const [damagePops, setDamagePops] = useState<DamagePop[]>([]);
  const [bottleMsg, setBottleMsg] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let game: Game | null = null;
    const outerFrame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (cancelled || !containerRef.current) return;
        game = new Game(
          container,
          setHud,
          (label: string | null, x: number, y: number, color?: string) => {
            const element = labelRef.current;
            if (!element) return;
            element.style.display = label ? 'block' : 'none';
            if (label) {
              element.textContent = label;
              element.style.color = color ?? '#fff';
              element.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
            }
          },
          (text, x, y) => {
            const element = mumbleRef.current;
            if (!element) return;
            element.style.display = text ? 'block' : 'none';
            if (text) {
              element.textContent = text;
              element.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
            }
          },
          (vitals, x, y) => vitalWarnRef.current?.update(vitals, x, y),
          (toast) => {
            const id = ++pickupIdRef.current;
            setPickups((list) => [...list, { ...toast, id }]);
            window.setTimeout(
              () => setPickups((list) => list.filter((item) => item.id !== id)),
              1400,
            );
          },
          (amount, x, y) => {
            const id = ++damageIdRef.current;
            setDamagePops((list) => [...list, { id, amount, x, y }]);
            window.setTimeout(
              () => setDamagePops((list) => list.filter((item) => item.id !== id)),
              1000,
            );
          },
          (emoji, x, y) => {
            const element = dogEmojiRef.current;
            if (!element) return;
            element.style.display = emoji ? 'block' : 'none';
            if (emoji) {
              element.textContent = emoji;
              element.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
            }
          },
          setBottleMsg,
          {
            host: net?.host,
            guest: net?.guest,
            ...(net?.host
              ? {
                  seeds: { terrainSeed: net.host.terrainSeed },
                  save: net.host.initialSave,
                }
              : net?.guest
                ? {}
                : { save: initialSave ?? null }),
          },
        );
        gameRef.current = game;
        game.start();
        requestAnimationFrame(() => setWorldReady(true));
      }),
    );

    return () => {
      cancelled = true;
      cancelAnimationFrame(outerFrame);
      game?.dispose();
      gameRef.current = null;
    };
  }, []);

  return {
    gameRef,
    containerRef,
    labelRef,
    mumbleRef,
    dogEmojiRef,
    vitalWarnRef,
    hud,
    worldReady,
    pickups,
    damagePops,
    bottleMsg,
    setBottleMsg,
  };
}
