'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_AUDIO_SETTINGS, loadAudioSettings } from '@/game/audio/AudioSettings';
import { buildInviteQr, buildInviteUrl, shareRoomInvite } from './roomInvite';

/** 滑杆行:名称 + range input + 百分比 */
function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label
      style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, color: '#4a3b2a' }}
    >
      <span style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#5b8a4a', height: 28 }}
      />
    </label>
  );
}

/** 联机区状态:由外层驱动,单机时可发起多人模式,已联机时展示房间码;缺省(客人端)不渲染联机区 */
export type MultiplayerSection = {
  roomCode: string;
  busy: boolean;
  error: string;
  onEnable: () => void;
};

/**
 * 游戏内设置面板:音乐/音效音量(拖动即热应用并持久化)、
 * 联机(单机中途开启多人模式或查看房间码邀请朋友),
 * 以及「返回主界面」(由外层卸载游戏回到开始界面)。
 */
export function SettingsPanel({
  onApply,
  onExit,
  onClose,
  multiplayer,
}: {
  /** 音量变化时热应用到 GameAudio 并持久化 */
  onApply: (settings: { music: number; sfx: number }) => void;
  onExit: () => void;
  onClose: () => void;
  /** 联机区;客人端不传 */
  multiplayer?: MultiplayerSection;
}) {
  const [settings, setSettings] = useState(loadAudioSettings() ?? DEFAULT_AUDIO_SETTINGS);
  const apply = (next: { music: number; sfx: number }) => {
    setSettings(next);
    onApply(next);
  };
  const [qr, setQr] = useState('');
  const [shareTip, setShareTip] = useState('');
  const inviteUrl = multiplayer?.roomCode ? buildInviteUrl(multiplayer.roomCode) : '';
  useEffect(() => {
    setShareTip('');
    if (!inviteUrl) return setQr('');
    void buildInviteQr(inviteUrl).then(setQr);
  }, [inviteUrl]);
  const share = async () => {
    if (!multiplayer?.roomCode) return;
    setShareTip((await shareRoomInvite(multiplayer.roomCode, inviteUrl)) ?? '');
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(84vw, 340px)',
          padding: 20,
          background: '#fdf8ee',
          borderRadius: 16,
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#4a3b2a' }}>设置</div>
        <SliderRow
          label="🎵 音乐"
          value={settings.music}
          onChange={(v) => apply({ ...settings, music: v })}
        />
        <SliderRow
          label="🔊 音效"
          value={settings.sfx}
          onChange={(v) => apply({ ...settings, sfx: v })}
        />
        {multiplayer &&
          (multiplayer.roomCode ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '12px 0',
                borderTop: '1px solid rgba(0,0,0,0.08)',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <span style={{ fontSize: 13, color: '#53664a' }}>多人游戏 · 房间码</span>
              <strong style={{ fontSize: 28, letterSpacing: '.18em', fontFamily: 'monospace', color: '#2c5f2d' }}>
                {multiplayer.roomCode}
              </strong>
              {qr && (
                <img
                  src={qr}
                  alt={`房间 ${multiplayer.roomCode} 的邀请二维码`}
                  style={{ width: 'min(46vw,170px)', height: 'min(46vw,170px)', borderRadius: 8 }}
                />
              )}
              <button
                onClick={share}
                style={{
                  padding: '10px 22px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  background: '#f59a1f',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                分享邀请
              </button>
              {shareTip && <span style={{ fontSize: 12, color: '#9a6018' }}>{shareTip}</span>}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '12px 0',
                borderTop: '1px solid rgba(0,0,0,0.08)',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <span style={{ fontSize: 13, color: '#53664a' }}>多人游戏:让朋友中途加入当前这座岛</span>
              <button
                disabled={multiplayer.busy}
                onClick={multiplayer.onEnable}
                style={{
                  padding: '12px 0',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#fff',
                  background: multiplayer.busy ? '#a89f8d' : '#4d9e4f',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                {multiplayer.busy ? '正在创建房间…' : '开启多人模式'}
              </button>
              {multiplayer.error && <span style={{ fontSize: 12, color: '#c0392b' }}>{multiplayer.error}</span>}
            </div>
          ))}
        <button
          onClick={onExit}
          style={{
            padding: '12px 0',
            fontSize: 15,
            fontWeight: 600,
            color: '#fff',
            background: '#c0392b',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          返回主界面
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '10px 0',
            fontSize: 15,
            color: '#4a3b2a',
            background: 'rgba(0,0,0,0.06)',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          继续游戏
        </button>
      </div>
    </div>
  );
}
