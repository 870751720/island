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

  const back = () => {
    host?.dispose();
    guest?.dispose();
    onBack();
  };

  const copy = async (text: string, success: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(success);
    } catch {
      setStatus('复制失败，请长按房间码复制');
    }
  };

  const pasteFromClipboard = async (target: 'invite' | 'answer') => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) throw new Error();
      if (target === 'invite') setInvite(text);
      else setPaste(text);
      setStatus('已从剪贴板粘贴');
    } catch {
      setStatus('无法读取剪贴板，请长按输入框手动粘贴');
    }
  };

  const shareInvite = async () => {
    if (!invite) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: '去你的岛联机邀请', text: invite });
        setStatus('邀请码已分享，等待朋友回传');
      } else {
        await copy(invite, '邀请码已复制，发给朋友即可');
      }
    } catch {
      // 用户取消系统分享时保持当前步骤，不显示错误。
    }
  };

  // 房主:轮询已连接的客人列表(连接在粘贴回传码后建立)
  useEffect(() => {
    if (!host) return;
    const timer = setInterval(() => setPlayers([...host.guestNames]), 500);
    return () => clearInterval(timer);
  }, [host]);

  // 客人:收到房主的开始消息即进入游戏
  useEffect(() => {
    if (guest) {
      guest.onStarted = () => onBegin(guest);
      guest.onRejected = (reason) => {
        setBusy(false);
        setStatus(reason);
      };
    }
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
      setStatus('连接成功！可以继续邀请，或开始游戏');
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
        <p className="room-subtitle">
          {mode === 'host' ? '邀请 1–3 位朋友来到同一座岛' : '按房主发来的邀请完成连接'}
        </p>
        {mode === 'host' ? (
          <>
            {!invite && (
              <button className="room-button" disabled={busy || players.length >= 3} onClick={genInvite}>
                {players.length >= 3 ? '房间已满' : players.length ? '邀请下一位朋友' : '邀请朋友'}
              </button>
            )}
            {invite && (
              <>
                <div className="room-step"><b>1</b><span>把邀请码发给朋友</span></div>
                <textarea className="room-code" readOnly value={invite} onClick={(e) => e.currentTarget.select()} />
                <div className="room-actions">
                  <button onClick={shareInvite}>分享邀请码</button>
                  <button onClick={() => copy(invite, '邀请码已复制')}>复制</button>
                </div>
                <div className="room-step"><b>2</b><span>粘贴朋友发回的回传码</span></div>
                <textarea
                  className="room-code room-paste"
                  placeholder="粘贴回传码"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                />
                <button className="room-clipboard" onClick={() => pasteFromClipboard('answer')}>从剪贴板粘贴</button>
                <button className="room-button" disabled={busy || !paste.trim()} onClick={acceptAnswer}>
                  完成连接
                </button>
              </>
            )}
            <div className="room-players">
              <p>房主(你)</p>
              {players.map((p, i) => (
                <p key={i}>🧑‍🤝‍🧑 {p}</p>
              ))}
            </div>
            <button className="room-button room-start" disabled={busy || players.length === 0} onClick={() => host && onBegin(host)}>
              {players.length > 0 ? `开始游戏 · ${players.length + 1} 人` : '等待至少 1 位朋友'}
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
                <div className="room-step"><b>1</b><span>输入昵称并粘贴房主的邀请码</span></div>
                <textarea
                  className="room-code room-paste"
                  placeholder="粘贴邀请码"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                />
                <button className="room-clipboard" onClick={() => pasteFromClipboard('invite')}>从剪贴板粘贴</button>
                <button className="room-button" disabled={busy || !invite.trim() || !name.trim()} onClick={join}>
                  下一步
                </button>
              </>
            ) : (
              <>
                <div className="room-step"><b>2</b><span>把回传码发给房主</span></div>
                <textarea className="room-code" readOnly value={answerCode} onClick={(e) => e.currentTarget.select()} />
                <button className="room-button" onClick={() => copy(answerCode, '回传码已复制，发给房主即可')}>复制回传码</button>
                <p className="room-waiting"><span /> 等待房主完成连接并开始游戏</p>
              </>
            )}
          </>
        )}
        {status && <p className="room-status">{status}</p>}
        <button className="room-back" onClick={back}>
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
.room-subtitle { margin: -6px 0 14px; color: #6b7a5e; font-size: 13px; }
.room-step { display: flex; align-items: center; gap: 8px; margin: 14px 0 7px; text-align: left; color: #44513a; font-size: 14px; }
.room-step b { display: grid; place-items: center; flex: 0 0 26px; height: 26px; border-radius: 50%; background: #4d9e4f; color: white; }
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
.room-actions { display: flex; gap: 8px; margin-top: 8px; }
.room-actions button, .room-clipboard { min-height: 44px; border: 1.5px solid rgba(44,95,45,0.25); border-radius: 10px; background: rgba(255,255,255,0.8); color: #2c5f2d; font-weight: 700; }
.room-actions button { flex: 1; }
.room-clipboard { width: 100%; margin-top: 7px; }
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
.room-waiting { margin: 14px 0 0; color: #6b7a5e; font-size: 13px; }
.room-waiting span { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #f59a1f; animation: room-pulse 1.2s infinite; }
@keyframes room-pulse { 50% { opacity: .3; transform: scale(.75); } }
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
