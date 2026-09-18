'use client';
import { loadQuestGuide } from '@/game/quests/QuestSettings';
import { MenuIcon } from './icons/MenuIcons';
import { GameModeSettings } from './GameModeSettings';
import { MobileDisplaySetting } from './display/MobileDisplay';
import { pressAction } from './pressAction';
import { swallowTrailingClick } from './wiki/wikiTaps';

import { gameTheme, gameButtonStyle } from './gameTheme';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './SettingsPanel.module.css';
import { DEFAULT_AUDIO_SETTINGS, loadAudioSettings } from '@/game/audio/AudioSettings';
import { buildInviteQr, buildInviteUrl, shareRoomInvite } from './roomInvite';
import { GAME_MODE_LABELS, type GameMode } from '@/game/GameMode';

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
 * 底部「继续游戏」按钮同时展示当前游戏模式。
 */
export function SettingsPanel({
  onAdjustHud,
  onQuestGuide,
  onApply,
  onExit,
  onClose,
  onEnterPhotoMode,
  onOpenWiki,
  onSecretGmTrigger,
  multiplayer,
  modeSettings,
  mode,
}: {
  onAdjustHud: () => void;
  /** 音量变化时热应用到 GameAudio 并持久化 */
  onQuestGuide: (enabled: boolean) => void;
  onApply: (settings: { music: number; sfx: number }) => void;
  onExit: () => void;
  onClose: () => void;
  /** 进入相机模式(拍照模式):隐藏玩法 UI 自由取景 */
  onEnterPhotoMode: () => void;
  /** 打开游戏图鉴弹层(关闭图鉴后回到设置) */
  onOpenWiki: () => void;
  /** 连续点击标题「设置」5 次(2 秒内)触发 GM 面板;纯文字热点,不表现任何点击反馈 */
  onSecretGmTrigger: () => void;
  /** 联机区;客人端不传 */
  multiplayer?: MultiplayerSection;
  modeSettings?: React.ComponentProps<typeof GameModeSettings>;
  /** 当前游戏模式,展示在「继续游戏」按钮上 */
  mode: GameMode;
}) {
  const [tab, setTab] = useState<'audio' | 'interface' | 'game'>('game');
  const [guide, setGuide] = useState(loadQuestGuide);
  const [settings, setSettings] = useState(loadAudioSettings() ?? DEFAULT_AUDIO_SETTINGS);
  const apply = (next: { music: number; sfx: number }) => {
    setSettings(next);
    onApply(next);
  };
  const [qr, setQr] = useState('');
  const [shareTip, setShareTip] = useState('');
  // 连续 5 次点击标题「设置」(2 秒内)触发 GM 面板
  const gmTapsRef = useRef<number[]>([]);
  const handleTitleTap = () => {
    const now = performance.now();
    const taps = gmTapsRef.current.filter((t) => now - t < 2000);
    taps.push(now);
    gmTapsRef.current = taps;
    if (taps.length >= 5) {
      gmTapsRef.current = [];
      onSecretGmTrigger();
    }
  };
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
      onPointerDown={(event) => {
        // 入口在 pointerdown 打开面板，松手产生的 click 不应关闭新遮罩。
        if (event.button === 0 && event.target === event.currentTarget) onClose();
      }}
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
        className={`hud-panel-enter ${styles.panel}`}
        role="dialog" aria-modal="true" aria-label="设置"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}><strong className={styles.title} onClick={handleTitleTap}>设置</strong><button className={styles.close} onClick={onClose} aria-label="关闭设置">×</button></div>
        <nav className={styles.tabs} aria-label="设置分类">
          {([['game', '游戏'], ['interface', '界面'], ['audio', '声音']] as const).map(([id, label]) =>
            <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
        <div className={styles.content} key={tab}>
        {tab === 'audio' && (
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
        )}
        {tab === 'interface' && <>
        <MobileDisplaySetting />
        <button style={gameButtonStyle} onClick={onAdjustHud}>调整顶部 UI 边距</button>
        <div className={styles.section}>
          <label className={styles.guideRow}>
            <span className={styles.guideTitle}>显示任务指引</span>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={guide}
              aria-label="显示任务指引"
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
        </>}
        {tab === 'game' && <>
        <button
          {...pressAction(() => {
            // 图鉴在按下瞬间打开,手指下方换成图鉴内容;吞掉尾随 click 避免误触其搜索框。
            swallowTrailingClick();
            onOpenWiki();
          })}
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
          <MenuIcon name="book" /> 游戏图鉴
        </button>
        {modeSettings && <GameModeSettings {...modeSettings} />}
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
                  style={{ width: 'min(calc(46 * var(--game-vw)),170px)', height: 'min(calc(46 * var(--game-vw)),170px)', borderRadius: 8 }}
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
          ) : (<>
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
          </>))}
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
        </>}
        </div>
        <button className={styles.footer}
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
          继续游戏: {GAME_MODE_LABELS[mode]}模式
        </button>
      </div>
    </div>
  );
}
