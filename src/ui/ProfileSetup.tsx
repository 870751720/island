'use client';

import { useState } from 'react';
import { menuFormsCss } from './start/formStyles';
import { MenuIcon } from './start/MenuIcon';
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
      <style>{menuFormsCss}</style>
      <div className="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <div className="form-emblem"><MenuIcon name="user" /></div>
        <p className="form-eyebrow">ISLAND PASSPORT / 岛民档案</p>
        <h3 className="profile-title" id="profile-title">{firstTime ? '创建你的幸存者' : '修改形象'}</h3>
        <p className="profile-subtitle">{firstTime ? '先告诉大家你是谁' : '昵称与性别随时可以改'}</p>

        <label className="profile-field-name" htmlFor="profile-name">你的名字</label>
        <div className={`profile-name-box ${valid ? '' : 'empty'}`}>
          <input
            id="profile-name"
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
            aria-pressed={gender === 'boy'}
            onClick={() => setGender('boy')}
          >
            <span className="gender-card-dot" />
            男孩
          </button>
          <button
            type="button"
            className={`gender-card girl ${gender === 'girl' ? 'selected' : ''}`}
            aria-pressed={gender === 'girl'}
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
            返回
          </button>
        )}
      </div>
    </div>
  );
}
