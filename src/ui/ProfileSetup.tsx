'use client';

import { useState } from 'react';
import type { PlayerProfile } from '@/game/playerProfile';

/** 昵称 + 性别设置弹窗:首次开始游戏前强制走一遍(firstTime),之后从开始界面/联机大厅点开修改。 */
export function ProfileSetup({
  firstTime,
  confirmText,
  initialName,
  initialGender,
  onConfirm,
  onCancel,
}: {
  firstTime: boolean;
  /** 确认按钮文案:拦截开始时为「开始冒险」,主动修改时为「保存设置」 */
  confirmText: string;
  initialName: string;
  initialGender: PlayerProfile['gender'];
  onConfirm: (profile: PlayerProfile) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState(initialGender);
  const valid = name.trim().length > 0;

  const confirm = () => {
    if (!valid) return;
    onConfirm({ name: name.trim(), gender });
  };

  return (
    <div className="profile-mask">
      <style>{css}</style>
      <div className="profile-panel">
        <h3 className="profile-title">{firstTime ? '创建你的幸存者' : '修改形象'}</h3>
        <p className="profile-subtitle">{firstTime ? '先告诉大家你是谁' : '昵称与性别随时可以改'}</p>

        <p className="profile-field-name">昵称</p>
        <div className={`profile-name-box ${valid ? '' : 'empty'}`}>
          <input
            className="profile-name-input"
            placeholder="给自己起个名字"
            maxLength={8}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && confirm()}
          />
          <span className="profile-name-count">{name.length}/8</span>
        </div>

        <p className="profile-field-name">性别</p>
        <div className="profile-gender">
          <button
            type="button"
            className={`gender-card boy ${gender === 'boy' ? 'selected' : ''}`}
            onClick={() => setGender('boy')}
          >
            <span className="gender-card-dot" />
            男孩
          </button>
          <button
            type="button"
            className={`gender-card girl ${gender === 'girl' ? 'selected' : ''}`}
            onClick={() => setGender('girl')}
          >
            <span className="gender-card-dot" />
            女孩
          </button>
        </div>

        <button className="profile-confirm" disabled={!valid} onClick={confirm}>
          {confirmText}
        </button>
        {!firstTime && onCancel && (
          <button className="profile-cancel" onClick={onCancel}>
            取消
          </button>
        )}
      </div>
    </div>
  );
}

const css = `
.profile-mask {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(12, 26, 16, 0.55);
  backdrop-filter: blur(2px);
  font-family: sans-serif;
  animation: profile-mask-in 0.2s ease-out;
}
@keyframes profile-mask-in { from { opacity: 0; } to { opacity: 1; } }
.profile-panel {
  width: min(84vw, 340px);
  padding: clamp(22px, 5vw, 30px) clamp(20px, 5vw, 26px) clamp(20px, 4vw, 24px);
  text-align: center;
  background: linear-gradient(rgba(255,253,245,0.97), rgba(255,248,232,0.95));
  border: 2px solid rgba(255,255,255,0.85);
  border-radius: 24px;
  box-shadow: 0 16px 48px rgba(20,60,90,0.35);
  animation: profile-panel-in 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);
}
@keyframes profile-panel-in {
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.profile-title {
  margin: 0;
  font-size: clamp(21px, 6vw, 25px);
  color: #4a3a1a;
  letter-spacing: 0.1em;
}
.profile-subtitle {
  margin: 8px 0 0;
  font-size: clamp(12px, 3.4vw, 13px);
  color: #9aa58a;
  letter-spacing: 0.04em;
}
.profile-field-name {
  margin: clamp(16px, 4vw, 20px) 0 8px;
  text-align: left;
  color: #44513a;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.profile-name-box {
  position: relative;
  display: flex;
  align-items: center;
  border: 1.5px solid rgba(44,95,45,0.25);
  border-radius: 14px;
  background: rgba(255,255,255,0.9);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.profile-name-box:focus-within {
  border-color: #f59a1f;
  box-shadow: 0 0 0 3px rgba(245,154,31,0.18);
}
.profile-name-box.empty:not(:focus-within) { border-style: dashed; }
.profile-name-input {
  flex: 1;
  min-height: 50px;
  padding: 0 14px;
  border: none;
  background: transparent;
  color: #2f402c;
  text-align: center;
  font-size: 16px;
  letter-spacing: 0.06em;
}
.profile-name-input:focus { outline: none; }
.profile-name-input::placeholder { color: #b6bfa8; letter-spacing: 0.02em; }
.profile-name-count {
  padding: 0 12px;
  color: #b6bfa8;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.profile-gender {
  display: flex;
  gap: 12px;
}
.gender-card {
  flex: 1;
  min-height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1.5px solid rgba(44,95,45,0.2);
  border-radius: 16px;
  background: rgba(255,255,255,0.72);
  color: #6b7a5e;
  font-size: clamp(16px, 4.6vw, 18px);
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: transform 0.1s ease, border-color 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}
.gender-card-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #cfd6c2;
  box-shadow: inset 0 2px 3px rgba(0,0,0,0.12);
  transition: background 0.15s ease, box-shadow 0.15s ease;
}
.gender-card:active { transform: scale(0.96); }
.gender-card.boy.selected {
  border-color: #5b9bd5;
  background: linear-gradient(rgba(129,183,229,0.22), rgba(91,155,213,0.1));
  color: #2f6db3;
  box-shadow: 0 4px 12px rgba(91,155,213,0.25);
}
.gender-card.boy.selected .gender-card-dot { background: #5b9bd5; box-shadow: 0 0 0 3px rgba(91,155,213,0.25); }
.gender-card.girl.selected {
  border-color: #e0868f;
  background: linear-gradient(rgba(236,163,171,0.22), rgba(224,134,143,0.1));
  color: #c05a66;
  box-shadow: 0 4px 12px rgba(224,134,143,0.25);
}
.gender-card.girl.selected .gender-card-dot { background: #e0868f; box-shadow: 0 0 0 3px rgba(224,134,143,0.25); }
.profile-confirm {
  margin-top: clamp(18px, 5vw, 24px);
  width: 100%;
  min-height: 52px;
  border: none;
  border-radius: 15px;
  background: linear-gradient(#ffbe5c, #f59a1f);
  color: #fff;
  font-size: clamp(16px, 4.6vw, 18px);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  box-shadow: 0 5px 0 #c97c12;
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease, opacity 0.15s ease;
}
.profile-confirm:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 1px 0 #c97c12; }
.profile-confirm:disabled {
  background: linear-gradient(#c9c2b4, #a89f8d);
  box-shadow: 0 5px 0 #8a8272;
  cursor: default;
}
.profile-cancel {
  margin-top: 10px;
  width: 100%;
  min-height: 42px;
  border: 1.5px solid rgba(44,95,45,0.25);
  border-radius: 11px;
  background: rgba(44,95,45,0.06);
  color: #2c5f2d;
  font-size: 14px;
  cursor: pointer;
}
`;
