'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGameMode, rememberGameMode, type GameMode } from '@/game/GameMode';
import { NewGameDialog } from './start/NewGameDialog';
import { ModeSelector } from './start/ModeSelector';
import { MenuIcon } from './start/MenuIcon';
import { useMenuAudio } from './start/useMenuAudio';
import { buttonAudio } from './start/buttonAudio';
import { playUiSound } from '@/game/audio/UiAudio';
import { menuBackdrop } from './start/palette';
import { startScreenCss } from './start/styles';
import { attachMenuEggs, menuEggCss } from './start/menuEggs';
import { IslandTitleEgg } from './start/IslandEggs';
import { IslandScene } from './start/IslandScene';
import { SaveSystem, type SaveData } from '@/game/systems/SaveSystem';
import { MetaProgress } from '@/game/meta/MetaProgress';
import { META_TREE } from '@/game/meta/MetaTree';
import { MetaPanel } from './MetaPanel';
import { ProfileSetup } from './ProfileSetup';
import { loadProfile, saveProfile, legacyNickname, type PlayerProfile } from '@/game/playerProfile';

/** 开始方式:继续 = 恢复存档,新档 = 清掉旧存档从头开始 */
export type StartMode = 'continue' | 'new';
/** 联机角色:创建房间(房主)或加入房间(客人) */
export type MultiplayerRole = 'host' | 'guest';

/** 是否已有荒岛传承(任意求生心得或已解锁节点):没有时主菜单不显示入口 */
function hasLegacy(): boolean {
  if (MetaProgress.points() > 0) return true;
  return META_TREE.some((branch) => branch.nodes.some((node) => MetaProgress.level(node.id) > 0));
}

export function StartScreen({
  onStart,
  onMultiplayer,
  notice,
  multiplayerEnabled = true,
}: {
  onStart: (mode: StartMode, gameMode: GameMode) => void;
  onMultiplayer: (role: MultiplayerRole, gameMode: GameMode) => void;
  notice?: string;
  /** 小红书离线渠道关闭创建/加入房间入口，保留其余开始界面与单机流程。 */
  multiplayerEnabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => rootRef.current ? attachMenuEggs(rootRef.current) : undefined, []);
  const [savedGame] = useState(() => SaveSystem.load());
  const hasSave = !!savedGame;
  const [gameMode, setGameMode] = useState<GameMode>('leisure');
  const selectMode = (mode: GameMode) => { setGameMode(mode); rememberGameMode(mode); };
  const audio = useMenuAudio();
  const [legacy] = useState(hasLegacy);
  const [showMeta, setShowMeta] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  /** 设置弹窗打开时暂存的待开始方式:首次设置完成后无缝接着进入游戏 */
  const [pendingStart, setPendingStart] = useState<StartMode | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  /** 新档确认期间不修改现有存档或发放传承点。 */
  const [newGameSave, setNewGameSave] = useState<{ save: SaveData | null } | null>(null);
  // 预渲染 HTML 里的按钮在 React 水合完成前无法响应点击,水合前不渲染按钮只显示加载提示
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    setGameMode(loadGameMode());
    setProfile(loadProfile());
  }, []);

  /** 首次开始游戏前必须先设置昵称与性别;已设置过则直接进入 */
  const requestStart = (mode: StartMode) => {
    if (profile) onStart(mode, gameMode);
    else {
      setPendingStart(mode);
      setShowSetup(true);
    }
  };

  const startNew = () => {
    setNewGameSave({ save: SaveSystem.load() });
  };

  return (
    <div ref={rootRef} className="start-screen" data-ready={ready}
      style={{ position: 'absolute', inset: 0, background: menuBackdrop }} onPointerDownCapture={(event) => {
      if (!(event.target as Element).closest('.menu-sound')) audio.unlock();
    }} onClickCapture={buttonAudio}>
      <style>{startScreenCss}{menuEggCss}</style>
      <div className="start-layout" style={{ visibility: ready ? 'visible' : 'hidden' }} inert={!ready || showMeta || showSetup || !!newGameSave}>
        <header className="menu-topbar">
          <span className="menu-brand"><MenuIcon name="compass" /> 一座岛，一段新生活</span>
          {ready && <button className="menu-sound" data-ui-sound="manual" onClick={audio.toggle} aria-label={audio.enabled && audio.started ? '关闭开始界面声音' : '开启开始界面声音'} aria-pressed={audio.enabled && audio.started}>
            <MenuIcon name={audio.enabled ? 'sound' : 'muted'} />
            <span>{audio.enabled ? (audio.started ? '海风已响起' : '轻触听海') : '声音已关闭'}</span>
          </button>}
        </header>
        <main className="menu-content">
          <section className="menu-heading" aria-label="去你的岛">
            <p className="menu-eyebrow">A LITTLE ISLAND. A NEW BEGINNING.</p>
            <h1 className="start-title">去你的<IslandTitleEgg />。</h1>
            <p className="start-subtitle">把喧嚣留在岸上。<br />从一无所有，到拥有自己的小岛。</p>
            <IslandScene interactive={ready} paused={!ready || showMeta || showSetup || !!newGameSave} />
          </section>
          <section className="menu-actions" aria-label="开始冒险">
            {notice && <p className="start-notice" role="status">{notice}</p>}
            {ready ? <>
              <div className="menu-save-label"><span>{hasSave ? '你的岛，还在等你' : '下一站，自由'}</span><span>{hasSave ? `已生存 ${savedGame.day ?? 1} 天` : '采集 / 建造 / 生存'}</span></div>
              {!hasSave && <ModeSelector value={gameMode} onChange={selectMode} />}
              <button className="start-button" data-ui-sound="manual" onClick={() => { playUiSound('confirm'); if (hasSave) requestStart('continue'); else startNew(); }}>
                <span><strong>{hasSave ? '继续游戏' : '开始游戏'}</strong><small>{hasSave ? '回到熟悉的海风里' : '向着属于你的岛，出发'}</small></span><MenuIcon name="arrow" />
              </button>
              {multiplayerEnabled && (
                <div className="start-mp">
                  <button className="mp-button" onClick={() => onMultiplayer('host', gameMode)}><MenuIcon name="flag" /><span>创建房间<small>邀朋友一起生存</small></span></button>
                  <button className="mp-button" onClick={() => onMultiplayer('guest', gameMode)}><MenuIcon name="people" /><span>加入房间<small>赴一场海岛之约</small></span></button>
                </div>
              )}
              <div className="menu-utilities">
                <button className="profile-chip" onClick={() => { setPendingStart(null); setShowSetup(true); }}><MenuIcon name="user" />设置形象</button>
                {hasSave && <button className="new-game-button" data-ui-sound="manual" onClick={startNew}>开新档</button>}
                {legacy && <button className="legacy-button" onClick={() => setShowMeta(true)}>荒岛传承</button>}
              </div>
            </> : <p className="start-loading" role="status">正在寻找你的岛…</p>}
          </section>
        </main>
        <footer className="menu-footer"><span>慢慢生活，好好活着。</span><span>EXPLORE · CRAFT · SURVIVE</span></footer>
      </div>
      {newGameSave && <NewGameDialog save={newGameSave.save} value={gameMode} onChange={selectMode}
        onCancel={() => setNewGameSave(null)} onConfirm={() => {
          playUiSound('confirm');
          setNewGameSave(null);
          requestStart('new');
        }} />}
      {showMeta && <MetaPanel onClose={() => setShowMeta(false)} onLearn={() => playUiSound('confirm')} />}
      {showSetup && (
        <ProfileSetup
          firstTime={!profile}
          confirmText={pendingStart ? '开始冒险' : '保存设置'}
          initialName={profile?.name ?? legacyNickname()}
          initialGender={profile?.gender ?? 'boy'}
          onConfirm={(next) => {
            saveProfile(next);
            setProfile(next);
            const mode = pendingStart;
            setShowSetup(false);
            setPendingStart(null);
            if (mode) onStart(mode, gameMode);
          }}
          onCancel={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}
