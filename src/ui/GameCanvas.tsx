'use client';

import type { CompanionKind } from '@/game/companions/CompanionDefinition';
import { useEffect, useState } from 'react';
import { StartScreen, type StartMode, type MultiplayerRole } from './StartScreen';
import { type GameMode } from '@/game/GameMode';
import { RoomLobby } from './RoomLobby';
import { GameplayUI } from './GameplayUI';
import { MetaProgress, legacyPointsForDay } from '@/game/meta/MetaProgress';
import { SaveSystem } from '@/game/systems/SaveSystem';
import type { SaveData } from '@/game/systems/SaveSystem';
import { NetHost } from '@/game/net/NetHost';
import { NetGuest } from '@/game/net/NetGuest';
import { MobileDisplay } from './display/MobileDisplay';
import dynamic from 'next/dynamic';

const CloudStartGate = process.env.NEXT_PUBLIC_XHS_EXPORT !== '1'
  ? dynamic(() => import('./cloud/CloudStartGate'), { ssr: false }) : null;

type Phase = 'start' | 'host' | 'guest' | 'playing';
type Entry = { kind: 'single'; mode: StartMode; gameMode: GameMode; pet: CompanionKind }
  | { kind: 'host' | 'guest'; gameMode: GameMode };

/** 阶段路由:开始界面 / 联机大厅 / 游戏进行中(含死亡弹窗)的切换。 */
export function GameCanvas() {
  return <MobileDisplay><GamePhases /></MobileDisplay>;
}

function GamePhases() {
  const multiplayerEnabled = process.env.NEXT_PUBLIC_XHS_EXPORT !== '1';
  const [pet, setPet] = useState<CompanionKind>('dog');
  const [gameMode, setGameMode] = useState<GameMode>('leisure');
  const [phase, setPhase] = useState<Phase>('start');
  const [host, setHost] = useState<NetHost | null>(null);
  const [guest, setGuest] = useState<NetGuest | null>(null);
  const [notice, setNotice] = useState('');
  const [disconnectNotice, setDisconnectNotice] = useState('');
  const [invitedRoom, setInvitedRoom] = useState('');
  /** 单机启动时锁定的存档选择:null=明确新档,SaveData=明确继续,避免 Game 构造时二次读取产生竞态 */
  const [singlePlayerSave, setSinglePlayerSave] = useState<SaveData | null>(null);
  const [pendingEntry, setPendingEntry] = useState<Entry | null>(null);
  const [initialBackupCode, setInitialBackupCode] = useState<string>();

  useEffect(() => {
    if (!multiplayerEnabled) return;
    const room = new URLSearchParams(window.location.search).get('room');
    if (!room) return;
    setInvitedRoom(room);
    requestEntry({ kind: 'guest', gameMode });
  }, []);

  const start = (mode: StartMode, selectedMode: GameMode, pet: CompanionKind) => {
    setPet(pet);
    setGameMode(selectedMode);
    setNotice('');
    if (mode === 'new') {
      const previous = SaveSystem.load();
      if (previous) MetaProgress.grant(legacyPointsForDay(previous.day, previous.gameMode));
      SaveSystem.clear();
      setSinglePlayerSave(null);
    } else {
      setSinglePlayerSave(SaveSystem.load());
    }
    setPhase('playing');
  };

  const enter = (entry: Entry, code?: string, useExistingLocal = false) => {
    setPendingEntry(null);
    setInitialBackupCode(code);
    if (entry.kind === 'single') {
      start(useExistingLocal ? 'continue' : entry.mode, entry.gameMode, entry.pet);
    } else {
      setGameMode(entry.gameMode);
      setNotice('');
      setPhase(entry.kind);
    }
  };
  const requestEntry = (entry: Entry) => {
    if (CloudStartGate) setPendingEntry(entry);
    else enter(entry);
  };

  const exit = () => {
    // 退出时一并断开联机会话(房主与客人都会回到开始界面)
    host?.dispose();
    guest?.dispose();
    setHost(null);
    setGuest(null);
    setInitialBackupCode(undefined);
    setPhase('start');
  };

  const guestDisconnected = () => {
    // 断线不清席位:回到加入页,房间码与昵称自动带出,重新点「加入房间」即可恢复原角色
    guest?.dispose();
    setGuest(null);
    setInitialBackupCode(undefined);
    setNotice('连接已断开。重新加入上次的房间即可恢复角色（席位保留 5 分钟）');
    setDisconnectNotice('连接已断开。直接点「加入房间」即可恢复角色（席位保留 5 分钟）');
    setPhase('guest');
  };

  if (pendingEntry && CloudStartGate) return <CloudStartGate
    onContinue={(code, useLocal) => enter(pendingEntry, code, useLocal)}
    onCancel={() => { setPendingEntry(null); setInitialBackupCode(undefined); setPhase('start'); }}
  />;
  if (phase === 'playing') {
    return (
      <GameplayUI
        net={{ host: host ?? undefined, guest: guest ?? undefined }}
        companionKind={pet}
        initialSave={singlePlayerSave}
        gameMode={gameMode}
        onExit={exit}
        onBecomeHost={setHost}
        multiplayerEnabled={multiplayerEnabled}
        initialBackupCode={initialBackupCode}
      />
    );
  }
  if (phase === 'host') {
    return (
      <RoomLobby
        mode="host"
        initialGameMode={gameMode}
        onBegin={(net) => {
          setHost(net as NetHost);
          setPhase('playing');
        }}
        onBack={() => { setInitialBackupCode(undefined); setPhase('start'); }}
      />
    );
  }
  if (phase === 'guest') {
    return (
      <RoomLobby
        mode="guest"
        initialRoomCode={invitedRoom}
        initialStatus={disconnectNotice}
        onBegin={(net) => {
          const nextGuest = net as NetGuest;
          nextGuest.onClosed = guestDisconnected;
          setGuest(nextGuest);
          setDisconnectNotice('');
          setPhase('playing');
        }}
        onBack={() => {
          setDisconnectNotice('');
          setInitialBackupCode(undefined);
          setPhase('start');
        }}
      />
    );
  }
  return (
    <StartScreen
      onStart={(mode, gameMode, pet) => requestEntry({ kind: 'single', mode, gameMode, pet })}
      onMultiplayer={(role: MultiplayerRole, selectedMode: GameMode) => {
        if (!multiplayerEnabled) return;
        requestEntry({ kind: role, gameMode: selectedMode });
      }}
      notice={notice}
      multiplayerEnabled={multiplayerEnabled}
    />
  );
}
