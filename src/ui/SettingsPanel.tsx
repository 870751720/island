'use client';
import { loadQuestGuide } from '@/game/quests/QuestSettings';
import { MenuIcon } from './icons/MenuIcons';

import { gameTheme, gamePanelStyle, gameButtonStyle } from './gameTheme';

import { useEffect, useState, type CSSProperties } from 'react';
import styles from './SettingsPanel.module.css';
import { DEFAULT_AUDIO_SETTINGS, loadAudioSettings } from '@/game/audio/AudioSettings';
import { buildInviteQr, buildInviteUrl, shareRoomInvite } from './roomInvite';

/** 滑杆行:名称 + range input + 百分比 */
function SliderRow({
  label,
  value,
  onChange,
}: {
  label: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className={styles.sliderRow}>
      <span className={styles.sliderHeading}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.value} aria-hidden="true">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.range}
        aria-valuetext={`${Math.round(value * 100)}%`}
        style={{ '--volume': `${value * 100}%` } as CSSProperties}
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
  onQuestGuide,
  onApply,
  onExit,
  onClose,
  onEnterPhotoMode,
  multiplayer,
}: {
  /** 音量变化时热应用到 GameAudio 并持久化 */
  onQuestGuide: (enabled: boolean) => void;
  onApply: (settings: { music: number; sfx: number }) => void;
  onExit: () => void;
  onClose: () => void;
  /** 进入相机模式(拍照模式):隐藏玩法 UI 自由取景 */
  onEnterPhotoMode: () => void;
  /** 联机区;客人端不传 */
  multiplayer?: MultiplayerSection;
}) {
  const [guide, setGuide] = useState(loadQuestGuide);
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
        background: gameTheme.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        fontFamily: gameTheme.font,
      }}
    >
      <div
        className="hud-panel-enter"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(calc(100vw - 72px), 340px)',
          padding: 20,
          maxHeight: '85dvh',
          overflowY: 'auto',
          ...gamePanelStyle,
          borderRadius: 22,
          boxShadow: gameTheme.shadow,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: gameTheme.ink }}>设置</div>
        <section className={styles.section} aria-label="声音设置">
          <h3 className={styles.sectionTitle}>声音</h3>
          <SliderRow
            label={<><MenuIcon name="music" />音乐</>}
            value={settings.music}
            onChange={(v) => apply({ ...settings, music: v })}
          />
          <SliderRow
            label={<><MenuIcon name="sound" />音效</>}
            value={settings.sfx}
            onChange={(v) => apply({ ...settings, sfx: v })}
          />
        </section>
        <div className={styles.section}>
          <label className={styles.guideRow}>
            <span className={styles.guideText}>
              <span className={styles.guideTitle}>显示任务指引</span>
              <span className={styles.guideHint} id="settings-guide-hint">关闭后仍会记录任务进度</span>
            </span>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={guide}
              aria-label="显示任务指引"
              aria-describedby="settings-guide-hint"
              onChange={(e) => {
                setGuide(e.target.checked);
                onQuestGuide(e.target.checked);
              }}
            />
          </label>
        </div>
        <button
          onClick={onEnterPhotoMode}
          style={{
            padding: '12px 0',
            fontSize: 15,
            fontWeight: 600,
            color: gameTheme.ink,
            background: gameTheme.action,
            ...gameButtonStyle,
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          <MenuIcon name="camera" /> 相机模式
        </button>
        {multiplayer &&
          (multiplayer.roomCode ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '12px 0',
                borderTop: gameTheme.line,
                borderBottom: gameTheme.line,
              }}
            >
              <span style={{ fontSize: 13, color: gameTheme.ink }}>多人游戏 · 房间码</span>
              <strong style={{ fontSize: 28, letterSpacing: '.18em', fontFamily: 'monospace', color: gameTheme.accent }}>
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
                  color: gameTheme.ink,
                  background: gameTheme.action,
                  ...gameButtonStyle,
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
                borderTop: gameTheme.line,
                borderBottom: gameTheme.line,
              }}
            >
              <span style={{ fontSize: 13, color: gameTheme.ink }}>多人游戏:让朋友中途加入当前这座岛</span>
              <button
                disabled={multiplayer.busy}
                onClick={multiplayer.onEnable}
                style={{
                  padding: '12px 0',
                  fontSize: 15,
                  fontWeight: 600,
                  color: gameTheme.ink,
                  background: multiplayer.busy ? gameTheme.disabled : gameTheme.action,
                  ...gameButtonStyle,
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                {multiplayer.busy ? '正在创建房间…' : '开启多人模式'}
              </button>
              {multiplayer.error && <span style={{ fontSize: 12, color: gameTheme.danger }}>{multiplayer.error}</span>}
            </div>
          ))}
        <button
          onClick={onExit}
          style={{
            padding: '12px 0',
            fontSize: 15,
            fontWeight: 600,
            color: gameTheme.danger,
            background: gameTheme.dangerSurface,
            ...gameButtonStyle,
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
            color: gameTheme.ink,
            background: gameTheme.inset,
            ...gameButtonStyle,
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
