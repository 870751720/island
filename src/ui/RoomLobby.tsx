'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildInviteQr, buildInviteUrl, shareRoomInvite } from './roomInvite';
import { NetHost } from '@/game/net/NetHost';
import { NetGuest, loadLastRoom } from '@/game/net/NetGuest';
import { normalizeRoomCode } from '@/game/net/Signaling';
import { loadProfile, saveProfile, legacyNickname, type PlayerProfile } from '@/game/playerProfile';
import { menuFormsCss } from './start/formStyles';
import { MenuIcon } from './start/MenuIcon';
import { ProfileSetup } from './ProfileSetup';
import { SaveSystem } from '@/game/systems/SaveSystem';

/** 自动信令大厅：房主分享五位数字码或二维码，客人输入昵称即可直接连接。 */
export function RoomLobby({
  mode,
  initialRoomCode = '',
  initialStatus = '',
  onBegin,
  onBack,
}: {
  mode: 'host' | 'guest';
  initialRoomCode?: string;
  initialStatus?: string;
  onBegin: (net: NetHost | NetGuest) => void;
  onBack: () => void;
}) {
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
  const [resume, setResume] = useState(() => mode === 'host' && !!SaveSystem.load());
  const [qr, setQr] = useState('');

  // 昵称与性别统一来自个人档案(开始界面设置);水合后读取,未设置时先引导设置
  useEffect(() => setProfile(loadProfile()), []);

  const inviteUrl = useMemo(() => (roomCode && typeof window !== 'undefined' ? buildInviteUrl(roomCode) : ''), [roomCode]);

  useEffect(() => {
    if (!inviteUrl || mode !== 'host') return setQr('');
    void buildInviteQr(inviteUrl).then(setQr);
  }, [inviteUrl, mode]);

  useEffect(() => {
    if (!host) return;
    const timer = window.setInterval(() => setPlayers([...host.guestNames]), 300);
    return () => window.clearInterval(timer);
  }, [host]);

  useEffect(() => {
    if (!guest) return;
    guest.onStarted = () => onBegin(guest);
    guest.onConnectionStatus = setStatus;
    guest.onClosed = () => {
      setBusy(false);
      setStatus('当前网络暂时无法连接房主，可能与运营商网络限制有关。请确认房主在线，或切换 Wi-Fi / 其他网络后重试。');
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
    if (!host || busy) return;
    setBusy(true);
    setStatus('正在创建房间…');
    try {
      host.useSavedWorld(resume ? SaveSystem.load() : null);
      setRoomCode(await host.createRoom());
      setStatus('房间已创建，朋友扫码或输入房间码即可加入');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '创建房间失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async () => {
    if (!guest || busy) return;
    setBusy(true);
    setStatus('正在连接房间…');
    try {
      await guest.join(roomCode, (profile?.name ?? '').trim(), profile?.gender);
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
    <div className="room-lobby">
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
          {mode === 'host' ? '生起营火，等朋友一起靠岸' : '输入房主分享的五位数字房间码'}
        </p>

        {mode === 'host' ? (
          !roomCode ? (
            <>
              {SaveSystem.load() && (
                <label className="room-resume">
                  <input type="checkbox" checked={resume} onChange={(event) => setResume(event.target.checked)} />
                  <span>继续上次保存的岛和队友进度</span>
                </label>
              )}
              <button className="room-button" disabled={busy} onClick={createRoom}>
                {busy ? '正在创建…' : '创建免费房间'}
              </button>
            </>
          ) : (
            <>
              <div className="room-code-card">
                <span className="form-eyebrow">登岛口令 · 房间码</span>
                <strong>{roomCode}</strong>
                {qr && <img className="room-qr" src={qr} alt={`房间 ${roomCode} 的邀请二维码`} />}
                <small>朋友扫码后输入昵称即可加入</small>
              </div>
              <button className="room-button" onClick={shareRoom}>分享邀请</button>
              <div className="room-players">
                <span className="form-eyebrow">已靠岸 · {players.length + 1} 人</span>
                <p className="connected">● {profile?.name || '房主'}（你）</p>
                {players.map((player) => <p className="connected" key={player}>● {player}</p>)}
                {!players.length && <p className="waiting"><span /> 等待朋友加入…</p>}
              </div>
              <button
                className="room-button room-start"
                disabled={busy || players.length === 0}
                onClick={() => host && onBegin(host)}
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
              onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))}
            />
            <label className="room-label" htmlFor="player-name">你的昵称</label>
            <button
              id="player-name"
              className={`room-name-row ${profile ? '' : 'unset'}`}
              onClick={() => setShowSetup(true)}
            >
              <MenuIcon name="user" /><span>{profile ? profile.name : '点击设置昵称与形象'}</span><small>修改 →</small>
            </button>
            <button
              className="room-button"
              disabled={busy || roomCode.length !== 5 || !profile?.name}
              onClick={joinRoom}
            >
              {busy ? '正在加入…' : '加入房间'}
            </button>
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
