'use client';

import type { CompanionKind } from '@/game/companions/CompanionDefinition';
import { useEffect, useMemo, useState } from 'react';
import { buildInviteQr, buildInviteUrl, shareRoomInvite } from './roomInvite';
import { NetHost } from '@/game/net/NetHost';
import { NetGuest, loadLastRoom } from '@/game/net/NetGuest';
import { normalizeRoomCode } from '@/game/net/Signaling';
import { loadProfile, saveProfile, legacyNickname, type PlayerProfile } from '@/game/playerProfile';
import { menuFormsCss } from './start/formStyles';
import { MenuIcon } from './start/MenuIcon';
import { ProfileSetup } from './ProfileSetup';
import { buttonAudio } from './start/buttonAudio';
import { playUiSound } from '@/game/audio/UiAudio';
import { loadGameMode, rememberGameMode, GAME_MODE_LABELS, type GameMode } from '@/game/GameMode';
import { CompanionSelector } from './start/CompanionSelector';
import { ModeSelector } from './start/ModeSelector';
import { SaveSystem } from '@/game/systems/SaveSystem';
import { CONNECTION_LABELS, type ConnectionMode } from '@/game/net/ConnectionMode';
import { ConnectionSelector } from './ConnectionSelector';
import { useRelayAvailability } from './useRelayAvailability';

/** 联机大厅：选择连接方式，房主分享房间码或二维码，客人用个人档案加入。 */
export function RoomLobby({
  mode,
  initialGameMode,
  initialRoomCode = '',
  initialStatus = '',
  initialConnectionMode,
  onBegin,
  onBack,
}: {
  mode: 'host' | 'guest';
  initialRoomCode?: string;
  initialGameMode?: GameMode;
  initialStatus?: string;
  initialConnectionMode?: ConnectionMode;
  onBegin: (net: NetHost | NetGuest) => void;
  onBack: () => void;
}) {
  const [pet, setPet] = useState<CompanionKind>('dog');
  const [gameMode, setGameMode] = useState<GameMode>(initialGameMode ?? loadGameMode);
  const [host] = useState(() => (mode === 'host' ? new NetHost() : null));
  const [guest] = useState(() => (mode === 'guest' ? new NetGuest() : null));
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [roomCode, setRoomCode] = useState(() => {
    if (initialRoomCode) return normalizeRoomCode(initialRoomCode);
    return mode === 'guest' ? normalizeRoomCode(loadLastRoom()?.code ?? '') : '';
  });
  const [players, setPlayers] = useState<string[]>([]);
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  /** 房主固定继续本机存档的岛;没有存档时才配置伙伴与模式开新岛 */
  const [savedGame] = useState(() => (mode === 'host' ? SaveSystem.load() : null));
  const [qr, setQr] = useState('');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(() => initialConnectionMode ?? (mode === 'guest' ? loadLastRoom()?.mode : undefined) ?? 'direct');
  const availability = useRelayAvailability(connectionMode, mode === 'guest' ? !busy : !roomCode);

  // 昵称与性别统一来自个人档案(开始界面设置);水合后读取,未设置时先引导设置
  useEffect(() => setProfile(loadProfile()), []);

  const inviteUrl = useMemo(() => (roomCode && typeof window !== 'undefined' ? buildInviteUrl(roomCode, connectionMode) : ''), [roomCode, connectionMode]);

  useEffect(() => {
    if (!inviteUrl || mode !== 'host') return setQr('');
    let active = true;
    setQr('');
    void buildInviteQr(inviteUrl).then(value => { if (active) setQr(value); }).catch(() => {});
    return () => { active = false; };
  }, [inviteUrl, mode]);

  useEffect(() => {
    if (!host) return;
    host.onRoomClosed = reason => { setRoomCode(''); setBusy(false); setStatus(reason); availability.refresh(); };
    const timer = window.setInterval(() => setPlayers([...host.guestNames]), 300);
    return () => window.clearInterval(timer);
  }, [host]);

  useEffect(() => {
    if (!guest) return;
    guest.onStarted = () => onBegin(guest);
    guest.onConnectionStatus = setStatus;
    guest.onClosed = (reason) => {
      setBusy(false);
      setStatus(reason || '当前网络暂时无法连接房主，请确认房主在线，或切换服务器中转后重试。');
    };
    guest.onRejected = (reason) => {
      setBusy(false);
      setStatus(reason);
    };
  }, [guest, onBegin]);

  const back = () => {
    host?.dispose();
    guest?.dispose();
    onBack();
  };

  const createRoom = async () => {
    if (!host || busy || (connectionMode === 'relay' && availability.full)) return;
    playUiSound('confirm');
    setBusy(true);
    setStatus('正在创建房间…');
    try {
      host.gameMode = gameMode;
      host.companionKind = pet;
      host.useSavedWorld(savedGame);
      setRoomCode(await host.createRoom(connectionMode));
      setStatus('房间已创建，朋友扫码或输入房间码即可加入');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '创建房间失败，请重试');
      availability.refresh();
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async () => {
    if (!guest || busy || roomCode.length !== 5 || !profile?.name) return;
    playUiSound('confirm');
    setBusy(true);
    setStatus('正在连接房间…');
    try {
      await guest.join(roomCode, (profile?.name ?? '').trim(), profile?.gender, connectionMode);
    } catch (error) {
      setBusy(false);
      setStatus(error instanceof Error ? error.message : '房间不存在或连接失败');
    }
  };

  const shareRoom = async () => {
    const message = await shareRoomInvite(roomCode, inviteUrl);
    if (message) setStatus(message);
  };

  return (
    <div className="room-lobby" onClickCapture={buttonAudio}>
      <style>{menuFormsCss}</style>
      <div className="room-layout">
      <aside className="room-intro">
        <span className="room-brand"><MenuIcon name="compass" /> 去你的岛。</span>
        <p className="form-eyebrow">BETTER TOGETHER</p>
        <h1>{mode === 'host' ? <>留一片海，<br />给朋友。</> : <>循着海风，<br />来找你。</>}</h1>
        <p>一起拾起第一根木头，<br />把荒岛变成我们的家。</p>
        <span className="room-intro-foot">一座岛 · 一起生活</span>
      </aside>
      <main className="room-panel">
        <div className="form-emblem"><MenuIcon name={mode === 'host' ? 'flag' : 'people'} /></div>
        <p className="form-eyebrow">{mode === 'host' ? 'SEND AN INVITATION / 发出邀请' : 'MEET ON THE ISLAND / 海岛相聚'}</p>
        <h2>{mode === 'host' ? '创建房间' : '加入房间'}</h2>
        <p className="room-subtitle">
          {mode === 'host' ? (savedGame ? '岛还在，邀朋友继续上次的进度' : '生起营火，等朋友一起靠岸') : '输入房主分享的五位数字房间码'}
        </p>

        {(mode === 'guest' || !roomCode) && <ConnectionSelector value={connectionMode} disabled={busy} joining={mode === 'guest'}
          availability={availability} onChange={value => { setConnectionMode(value); setStatus(''); }} />}

        {mode === 'host' ? (
          !roomCode ? (
            <>
              {!savedGame && <CompanionSelector value={pet} onChange={setPet} disabled={busy} />}
              {!savedGame && <><ModeSelector value={gameMode} disabled={busy} onChange={mode => { setGameMode(mode); rememberGameMode(mode); }} /><p className="room-subtitle">开局后无法切换。</p></>}
              <button className="room-button" data-ui-sound="manual" disabled={busy || (connectionMode === 'relay' && availability.full)} onClick={createRoom}>
                {busy ? '正在创建…' : connectionMode === 'relay' && availability.full ? '中转房间已满' : savedGame ? '继续' : '创建房间'}
              </button>
            </>
          ) : (
            <>
              <div className="room-code-card">
                <span className="form-eyebrow">{CONNECTION_LABELS[connectionMode]} · {GAME_MODE_LABELS[host?.gameMode ?? gameMode]} · 房间码</span>
                <strong>{roomCode}</strong>
                {qr && <img className="room-qr" src={qr} alt={`房间 ${roomCode} 的邀请二维码`} />}
                <small>扫码自动选择连接方式，手输房间码请选择{CONNECTION_LABELS[connectionMode]}</small>
              </div>
              <button className="room-button" onClick={shareRoom}>分享邀请</button>
              <div className="room-players">
                <span className="form-eyebrow">已靠岸 · {players.length + 1}{host?.maxPlayers ? ` / ${host.maxPlayers}` : ''} 人{host?.maxPlayers && players.length + 1 >= host.maxPlayers ? ' · 已满员' : ''}</span>
                <p className="connected">● {profile?.name || '房主'}（你）</p>
                {players.map((player) => <p className="connected" key={player}>● {player}</p>)}
                {!players.length && <p className="waiting"><span /> 等待朋友加入…</p>}
              </div>
              <button
                className="room-button room-start"
                data-ui-sound="manual"
                disabled={busy || players.length === 0}
                onClick={() => { if (host) { playUiSound('confirm'); onBegin(host); } }}
              >
                {players.length ? `开始游戏 · ${players.length + 1} 人` : '等待至少 1 位朋友'}
              </button>
            </>
          )
        ) : (
          <>
            <label className="room-label" htmlFor="room-code">房间码</label>
            <input
              id="room-code"
              className="room-code-input"
              inputMode="numeric"
              autoCorrect="off"
              placeholder="例如 73821"
              maxLength={5}
              value={roomCode}
              disabled={busy}
              onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))}
            />
            <label className="room-label" htmlFor="player-name">你的昵称</label>
            <button
              id="player-name"
              disabled={busy}
              className={`room-name-row ${profile ? '' : 'unset'}`}
              onClick={() => setShowSetup(true)}
            >
              <MenuIcon name="user" /><span>{profile ? profile.name : '点击设置昵称与形象'}</span><small>修改 →</small>
            </button>
            <button
              className="room-button"
              disabled={busy || roomCode.length !== 5 || !profile?.name}
              data-ui-sound="manual"
              onClick={joinRoom}
            >
              {busy ? '正在加入…' : '加入房间'}
            </button>
            {busy && <button className="room-back" onClick={() => { guest?.dispose(); setBusy(false); setStatus('已取消连接，可重新选择连接方式'); }}>取消连接</button>}
          </>
        )}

        {status && <p className="room-status" role="status">{status}</p>}
        <button className="room-back" onClick={back}>← 返回海岛首页</button>
      </main>
      </div>
      {showSetup && (
        <ProfileSetup
          firstTime={!profile}
          confirmText="保存设置"
          initialName={profile?.name ?? legacyNickname()}
          initialGender={profile?.gender ?? 'boy'}
          onConfirm={(next) => {
            saveProfile(next);
            setProfile(next);
            setShowSetup(false);
          }}
          onCancel={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}
