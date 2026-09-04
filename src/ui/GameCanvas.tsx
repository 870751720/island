'use client';

import { useEffect, useState } from 'react';
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
  const [notice, setNotice] = useState('');
  const [disconnectNotice, setDisconnectNotice] = useState('');
  const [invitedRoom, setInvitedRoom] = useState('');

  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get('room');
    if (!room) return;
    setInvitedRoom(room);
    setPhase('guest');
  }, []);

  const start = (mode: StartMode) => {
    setNotice('');
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

  const guestDisconnected = () => {
    // 断线不清席位:回到加入页,房间码与昵称自动带出,重新点「加入房间」即可恢复原角色
    guest?.dispose();
    setGuest(null);
    setNotice('连接已断开。重新加入上次的房间即可恢复角色（席位保留 5 分钟）');
    setDisconnectNotice('连接已断开。直接点「加入房间」即可恢复角色（席位保留 5 分钟）');
    setPhase('guest');
  };

  if (phase === 'playing') {
    return (
      <GameplayUI
        net={{ host: host ?? undefined, guest: guest ?? undefined }}
        onExit={exit}
        onBecomeHost={setHost}
      />
    );
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
          setPhase('start');
        }}
      />
    );
  }
  return (
    <StartScreen
      onStart={start}
      onMultiplayer={(role: MultiplayerRole) => {
        setNotice('');
        setPhase(role);
      }}
      notice={notice}
    />
  );
}
