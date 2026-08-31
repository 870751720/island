'use client';

import { useEffect, useState } from 'react';
import { NetHost } from '@/game/net/NetHost';
import { NetGuest } from '@/game/net/NetGuest';

/** 联机大厅:房主逐个朋友「生成邀请码 → 粘贴回传码」,客人「粘贴邀请码 → 回传码发回房主」。
 * 手动复制粘贴三次即可集齐最多 4 人,不需要任何第三方服务器。 */
export function RoomLobby({
  mode,
  onBegin,
  onBack,
}: {
  mode: 'host' | 'guest';
  onBegin: (net: NetHost | NetGuest) => void;
  onBack: () => void;
}) {
  const [host] = useState(() => (mode === 'host' ? new NetHost() : null));
  const [guest] = useState(() => (mode === 'guest' ? new NetGuest() : null));
  const [name, setName] = useState('');
  const [invite, setInvite] = useState(''); // 房主:当前邀请码 / 客人:粘贴区
  const [answerCode, setAnswerCode] = useState(''); // 客人:生成的回传码
  const [paste, setPaste] = useState(''); // 房主:粘贴客人的回传码
  const [players, setPlayers] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  // 房主:轮询已连接的客人列表(连接在粘贴回传码后建立)
  useEffect(() => {
    if (!host) return;
    const timer = setInterval(() => setPlayers([...host.guestNames]), 500);
    return () => clearInterval(timer);
  }, [host]);

  // 客人:收到房主的开始消息即进入游戏
  useEffect(() => {
    if (guest) guest.onStarted = () => onBegin(guest);
  }, [guest, onBegin]);

  const genInvite = async () => {
    if (!host || busy) return;
    setBusy(true);
    setStatus('正在生成邀请码…');
    try {
      setInvite(await host.createInvite());
      setStatus('把邀请码发给朋友,等他回传');
    } catch {
      setStatus('生成失败,请重试');
    }
    setBusy(false);
  };

  const acceptAnswer = async () => {
    if (!host || busy) return;
    setBusy(true);
    setStatus('正在连接…');
    try {
      await host.acceptAnswer(paste.trim());
      setPaste('');
      setInvite('');
      setStatus('已连接!可以继续邀请下一位,或开始游戏');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '回传码无效');
    }
    setBusy(false);
  };

  const join = async () => {
    if (!guest || busy) return;
    setBusy(true);
    setStatus('正在生成回传码…');
    try {
      const answer = await guest.join(invite.trim(), name);
      setAnswerCode(answer);
      setInvite('');
      setStatus('把回传码发回给房主,等待房主开始');
    } catch {
      setStatus('邀请码无效,请检查后重试');
    }
    setBusy(false);
  };

  return (
    <div className="room-lobby">
      <style>{css}</style>
      <div className="room-panel">
        <h2>{mode === 'host' ? '创建房间' : '加入房间'}</h2>
        {mode === 'host' ? (
          <>
            {!invite && (
              <button className="room-button" disabled={busy} onClick={genInvite}>
                生成邀请码
              </button>
            )}
            {invite && (
              <>
                <p className="room-tip">把邀请码发给朋友(微信粘贴即可)</p>
                <textarea className="room-code" readOnly value={invite} onClick={(e) => e.currentTarget.select()} />
                <p className="room-tip">朋友会回你一串回传码,粘贴到下面</p>
                <textarea
                  className="room-code room-paste"
                  placeholder="粘贴回传码"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                />
                <button className="room-button" disabled={busy || !paste.trim()} onClick={acceptAnswer}>
                  连接这位朋友
                </button>
              </>
            )}
            <div className="room-players">
              <p>房主(你)</p>
              {players.map((p, i) => (
                <p key={i}>🧑‍🤝‍🧑 {p}</p>
              ))}
            </div>
            <button className="room-button room-start" disabled={busy} onClick={() => host && onBegin(host)}>
              开始游戏{players.length > 0 ? `(${players.length + 1} 人)` : '(可先开始,朋友随时加入)'}
            </button>
          </>
        ) : (
          <>
            <input
              className="room-name"
              placeholder="你的名字"
              maxLength={8}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {!answerCode ? (
              <>
                <p className="room-tip">粘贴房主发来的邀请码</p>
                <textarea
                  className="room-code room-paste"
                  placeholder="粘贴邀请码"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                />
                <button className="room-button" disabled={busy || !invite.trim()} onClick={join}>
                  生成回传码
                </button>
              </>
            ) : (
              <>
                <p className="room-tip">把回传码发回给房主,然后等待开始</p>
                <textarea className="room-code" readOnly value={answerCode} onClick={(e) => e.currentTarget.select()} />
              </>
            )}
          </>
        )}
        {status && <p className="room-status">{status}</p>}
        <button className="room-back" onClick={onBack}>
          返回
        </button>
      </div>
    </div>
  );
}

const css = `
.room-lobby {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(#6fc3ee, #cfeefb 70%, #f3e2b8);
  font-family: sans-serif;
  overflow-y: auto;
}
.room-panel {
  width: min(88vw, 420px);
  margin: 24px 0;
  padding: clamp(18px, 5vw, 28px);
  background: linear-gradient(rgba(255,253,245,0.96), rgba(255,248,232,0.94));
  border: 2px solid rgba(255,255,255,0.85);
  border-radius: 22px;
  box-shadow: 0 16px 48px rgba(20,60,90,0.35);
  text-align: center;
}
.room-panel h2 {
  margin: 0 0 14px;
  color: #2c5f2d;
  letter-spacing: 0.1em;
}
.room-tip {
  margin: 10px 0 6px;
  font-size: 13px;
  color: #6b7a5e;
}
.room-code {
  width: 100%;
  min-height: 64px;
  padding: 8px;
  border: 1.5px solid rgba(44,95,45,0.25);
  border-radius: 10px;
  background: rgba(255,255,255,0.75);
  font-size: 11px;
  font-family: monospace;
  word-break: break-all;
  resize: none;
  box-sizing: border-box;
}
.room-paste { min-height: 54px; }
.room-name {
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: 1.5px solid rgba(44,95,45,0.25);
  border-radius: 10px;
  background: rgba(255,255,255,0.85);
  font-size: 15px;
  box-sizing: border-box;
  margin-bottom: 8px;
}
.room-button {
  margin-top: 12px;
  width: 100%;
  min-height: 48px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(#ffbe5c, #f59a1f);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.15em;
  box-shadow: 0 5px 0 #c97c12;
  cursor: pointer;
}
.room-button:disabled {
  background: linear-gradient(#c9c2b4, #a89f8d);
  box-shadow: 0 5px 0 #8a8272;
}
.room-start { background: linear-gradient(#7fd67f, #4d9e4f); box-shadow: 0 5px 0 #37793a; }
.room-players { margin: 12px 0 0; font-size: 14px; color: #44513a; }
.room-players p { margin: 4px 0; }
.room-status { margin: 10px 0 0; font-size: 12px; color: #b06a1f; }
.room-back {
  margin-top: 14px;
  width: 100%;
  min-height: 40px;
  border: 1.5px solid rgba(44,95,45,0.25);
  border-radius: 10px;
  background: rgba(44, 95, 45, 0.06);
  color: #2c5f2d;
  font-size: 14px;
  cursor: pointer;
}
`;
