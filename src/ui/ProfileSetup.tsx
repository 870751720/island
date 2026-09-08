'use client';

import { useState } from 'react';
import type { PlayerProfile } from '@/game/playerProfile';
import { PlayerPreview } from './PlayerPreview';

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
        <h3 className="profile-title">{firstTime ? '创建你的幸存者' : '修改形象'}</h3>        <div className="profile-preview">
          <PlayerPreview gender={gender} />
        </div>
        <div className="profile-gender">
          <button
            className={`gender-option ${gender === 'boy' ? 'selected' : ''}`}
            onClick={() => setGender('boy')}
          >
            男孩
          </button>
          <button
            className={`gender-option ${gender === 'girl' ? 'selected' : ''}`}
            onClick={() => setGender('girl')}
          >
            女孩
          </button>
        </div>
        <label className="profile-label" htmlFor="profile-name">昵称</label>
        <input
          id="profile-name"
          className="profile-name-input"
          placeholder="最多 8 个字"
          maxLength={8}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && confirm()}
        />
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
}
.profile-panel {
  width: min(84vw, 340px);
  padding: clamp(20px, 5vw, 28px);
  text-align: center;
  background: linear-gradient(rgba(255,253,245,0.97), rgba(255,248,232,0.95));
  border: 2px solid rgba(255,255,255,0.85);
  border-radius: 22px;
  box-shadow: 0 16px 48px rgba(20,60,90,0.35);
  animation: profile-panel-in 0.3s ease-out;
}
@keyframes profile-panel-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.profile-title {
  margin: 0;
  font-size: clamp(20px, 6vw, 24px);
  color: #4a3a1a;
  letter-spacing: 0.1em;
}
.profile-preview {
  margin: 14px auto 0;
  width: min(52vw, 190px);
  aspect-ratio: 1;
  border-radius: 18px;
  border: 2px solid rgba(255,255,255,0.9);
  background: linear-gradient(#bfe6f7 0%, #e8f6fc 62%, #f6e8c4 100%);
  box-shadow: inset 0 2px 10px rgba(20,60,90,0.12);
  overflow: hidden;
}
.profile-preview-canvas { width: 100%; height: 100%; }
.profile-preview-canvas canvas { width: 100% !important; height: 100% !important; display: block; }
.profile-gender {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}
.gender-option {
  flex: 1;
  min-height: 48px;
  border: 1.5px solid rgba(44,95,45,0.25);
  border-radius: 14px;
  background: rgba(255,255,255,0.7);
  color: #44513a;
  font-size: clamp(15px, 4.2vw, 17px);
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: transform 0.08s ease;
}
.gender-option.selected {
  border-color: #f59a1f;
  background: linear-gradient(rgba(255,190,92,0.22), rgba(245,154,31,0.1));
  color: #a8690f;
  box-shadow: 0 0 0 2px rgba(245,154,31,0.25);
}
.profile-label {
  display: block;
  margin: 14px 0 6px;
  text-align: left;
  color: #44513a;
  font-size: 13px;
  font-weight: 700;
}
.profile-name-input {
  width: 100%;
  min-height: 48px;
  box-sizing: border-box;
  border: 1.5px solid rgba(44,95,45,0.25);
  border-radius: 12px;
  background: rgba(255,255,255,0.86);
  color: #2f402c;
  text-align: center;
  font-size: 16px;
}
.profile-name-input:focus { outline: none; border-color: #f59a1f; }
.profile-confirm {
  margin-top: 16px;
  width: 100%;
  min-height: 50px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(#ffbe5c, #f59a1f);
  color: #fff;
  font-size: clamp(16px, 4.6vw, 18px);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  box-shadow: 0 5px 0 #c97c12;
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.profile-confirm:active { transform: translateY(4px); box-shadow: 0 1px 0 #c97c12; }
.profile-confirm:disabled {
  background: linear-gradient(#c9c2b4, #a89f8d);
  box-shadow: 0 5px 0 #8a8272;
  cursor: default;
}
.profile-cancel {
  margin-top: 10px;
  width: 100%;
  min-height: 44px;
  border: 1.5px solid rgba(44,95,45,0.25);
  border-radius: 10px;
  background: rgba(44,95,45,0.06);
  color: #2c5f2d;
  font-size: 14px;
  cursor: pointer;
}
`;
