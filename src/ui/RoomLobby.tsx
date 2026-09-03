'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { NetHost } from '@/game/net/NetHost';
import { NetGuest } from '@/game/net/NetGuest';
import { normalizeRoomCode } from '@/game/net/Signaling';
import { SaveSystem } from '@/game/systems/SaveSystem';

/** 自动信令大厅：房主分享六位码或二维码，客人输入昵称即可直接连接。 */
export function RoomLobby({
  mode,
  initialRoomCode = '',
  onBegin,
  onBack,
}: {
  mode: 'host' | 'guest';
  initialRoomCode?: string;
  onBegin: (net: NetHost | NetGuest) => void;
  onBack: () => void;
}) {
  const [host] = useState(() => (mode === 'host' ? new NetHost() : null));
  const [guest] = useState(() => (mode === 'guest' ? new NetGuest() : null));
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(() => normalizeRoomCode(initialRoomCode));
  const [players, setPlayers] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [resume, setResume] = useState(() => mode === 'host' && !!SaveSystem.load());
  const [qr, setQr] = useState('');

  const inviteUrl = useMemo(() => {
    if (!roomCode || typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('room', roomCode);
    return url.toString();
  }, [roomCode]);

  useEffect(() => {
    if (!inviteUrl || mode !== 'host') return setQr('');
    void QRCode.toDataURL(inviteUrl, { width: 220, margin: 1, errorCorrectionLevel: 'M' }).then(setQr);
  }, [inviteUrl, mode]);

  useEffect(() => {
    if (!host) return;
    const timer = window.setInterval(() => setPlayers([...host.guestNames]), 300);
    return () => window.clearInterval(timer);
  }, [host]);

  useEffect(() => {
    if (!guest) return;
    guest.onStarted = () => onBegin(guest);
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
      await guest.join(roomCode, name.trim());
      setStatus('连接成功，等待房主开始游戏');
    } catch (error) {
      setBusy(false);
      setStatus(error instanceof Error ? error.message : '房间不存在或连接失败');
    }
  };

  const shareRoom = async () => {
    const text = `来《去你的岛》和我一起玩！房间码：${roomCode}`;
    try {
      if (navigator.share) await navigator.share({ title: '去你的岛联机邀请', text, url: inviteUrl });
      else {
        await navigator.clipboard.writeText(`${text}\n${inviteUrl}`);
        setStatus('邀请链接已复制');
      }
    } catch {
      // 用户取消分享时不改变房间状态。
    }
  };

  return (
    <div className="room-lobby">
      <style>{css}</style>
      <div className="room-panel">
        <h2>{mode === 'host' ? '创建房间' : '加入房间'}</h2>
        <p className="room-subtitle">
          {mode === 'host' ? '免费直连，最多邀请 3 位朋友' : '输入房主分享的六位房间码'}
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
                <span>房间码</span>
                <strong>{roomCode}</strong>
                {qr && <img className="room-qr" src={qr} alt={`房间 ${roomCode} 的邀请二维码`} />}
                <small>朋友扫码后输入昵称即可加入</small>
              </div>
              <button className="room-button" onClick={shareRoom}>分享邀请</button>
              <div className="room-players">
                <p className="connected">● 房主（你）</p>
                {players.map((player) => <p className="connected" key={player}>● {player}</p>)}
                {players.length < 3 && <p className="waiting"><span /> 等待朋友加入…</p>}
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
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              placeholder="例如 7K3M9Q"
              maxLength={6}
              value={roomCode}
              onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))}
            />
            <label className="room-label" htmlFor="player-name">你的昵称</label>
            <input
              id="player-name"
              className="room-name"
              placeholder="请输入昵称"
              maxLength={8}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              className="room-button"
              disabled={busy || roomCode.length !== 6 || !name.trim()}
              onClick={joinRoom}
            >
              {busy ? '正在加入…' : '加入房间'}
            </button>
          </>
        )}

        {status && <p className="room-status">{status}</p>}
        <button className="room-back" onClick={back}>返回</button>
      </div>
    </div>
  );
}

const css = `
.room-lobby { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:linear-gradient(#6fc3ee,#cfeefb 70%,#f3e2b8); font-family:sans-serif; overflow-y:auto; }
.room-panel { width:min(86vw,400px); margin:20px 0; padding:clamp(18px,5vw,26px); background:linear-gradient(rgba(255,253,245,.97),rgba(255,248,232,.95)); border:2px solid rgba(255,255,255,.85); border-radius:22px; box-shadow:0 16px 48px rgba(20,60,90,.35); text-align:center; }
.room-panel h2 { margin:0 0 14px; color:#2c5f2d; letter-spacing:.1em; }
.room-subtitle { margin:-6px 0 18px; color:#6b7a5e; font-size:13px; }
.room-resume { min-height:44px; display:flex; align-items:center; gap:10px; margin:0 0 12px; text-align:left; color:#35452f; font-size:14px; }
.room-resume input { width:22px; height:22px; accent-color:#4d9e4f; }
.room-code-card { display:flex; flex-direction:column; align-items:center; gap:6px; padding:14px; border-radius:16px; background:rgba(255,255,255,.72); color:#53664a; }
.room-code-card strong { color:#2c5f2d; font-size:34px; letter-spacing:.18em; font-family:monospace; }
.room-code-card small { font-size:12px; }
.room-qr { width:min(48vw,190px); height:min(48vw,190px); border-radius:8px; }
.room-label { display:block; margin:12px 0 6px; text-align:left; color:#44513a; font-size:13px; font-weight:700; }
.room-code-input,.room-name { width:100%; min-height:48px; box-sizing:border-box; border:1.5px solid rgba(44,95,45,.25); border-radius:12px; background:rgba(255,255,255,.86); color:#2f402c; text-align:center; font-size:16px; }
.room-code-input { font:700 25px monospace; letter-spacing:.2em; text-transform:uppercase; }
.room-button { margin-top:14px; width:100%; min-height:48px; border:0; border-radius:14px; background:linear-gradient(#ffbe5c,#f59a1f); color:#fff; font-size:16px; font-weight:700; letter-spacing:.08em; box-shadow:0 5px 0 #c97c12; cursor:pointer; }
.room-button:disabled { background:linear-gradient(#c9c2b4,#a89f8d); box-shadow:0 5px 0 #8a8272; }
.room-start { background:linear-gradient(#7fd67f,#4d9e4f); box-shadow:0 5px 0 #37793a; }
.room-players { margin:14px 0 0; padding:10px 14px; border-radius:12px; background:rgba(44,95,45,.06); text-align:left; font-size:14px; }
.room-players p { margin:7px 0; }
.connected { color:#3d7b3f; }
.waiting { color:#76836d; }
.waiting span { display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59a1f; animation:room-pulse 1.2s infinite; }
@keyframes room-pulse { 50% { opacity:.3; transform:scale(.75); } }
.room-status { margin:12px 0 0; font-size:12px; color:#9a6018; }
.room-back { margin-top:14px; width:100%; min-height:44px; border:1.5px solid rgba(44,95,45,.25); border-radius:10px; background:rgba(44,95,45,.06); color:#2c5f2d; font-size:14px; cursor:pointer; }
`;
