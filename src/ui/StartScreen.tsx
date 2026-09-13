'use client';

import { useEffect, useState } from 'react';
import { MenuIcon } from './start/MenuIcon';
import { useMenuAudio } from './start/useMenuAudio';
import { startScreenCss } from './start/styles';
import { SaveSystem, type SaveData } from '@/game/systems/SaveSystem';
import { MetaProgress, legacyPointsForDay } from '@/game/meta/MetaProgress';
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
}: {
  onStart: (mode: StartMode) => void;
  onMultiplayer: (role: MultiplayerRole) => void;
  notice?: string;
}) {
  const [savedGame] = useState(() => SaveSystem.load());
  const hasSave = !!savedGame;
  const audio = useMenuAudio();
  const [legacy] = useState(hasLegacy);
  const [showMeta, setShowMeta] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  /** 设置弹窗打开时暂存的待开始方式:首次设置完成后无缝接着进入游戏 */
  const [pendingStart, setPendingStart] = useState<StartMode | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  /** 待确认的放弃本局结算数据(开新档且旧档超过 2 天时弹确认) */
  const [abandoning, setAbandoning] = useState<{ save: SaveData; points: number } | null>(null);
  // 预渲染 HTML 里的按钮在 React 水合完成前无法响应点击,水合前不渲染按钮只显示加载提示
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    setProfile(loadProfile());
  }, []);

  /** 首次开始游戏前必须先设置昵称与性别;已设置过则直接进入 */
  const requestStart = (mode: StartMode) => {
    if (profile) onStart(mode);
    else {
      setPendingStart(mode);
      setShowSetup(true);
    }
  };

  const startNew = () => {
    const save = SaveSystem.load();
    const points = legacyPointsForDay(save?.day ?? 1);
    // 旧档生存超过 2 天:重开前先确认,结算进荒岛传承
    if (save && points > 0) {
      setAbandoning({ save, points });
      return;
    }
    requestStart('new');
  };

  const confirmAbandon = () => {
    MetaProgress.grant(abandoning!.points);
    setAbandoning(null);
    requestStart('new');
  };

  return (
    <div className="start-screen" onPointerDownCapture={(event) => {
      if (!(event.target as Element).closest('.menu-sound')) audio.unlock();
    }} onClickCapture={(event) => {
      if ((event.target as HTMLElement).closest('button:not(.menu-sound)')) audio.feedback();
    }}>
      <style>{startScreenCss}</style>
      <div className="start-atmosphere" aria-hidden="true">
        <div className="menu-birds"><i /><i /><i /></div>
      </div>
      <div className="start-layout">
        <header className="menu-topbar">
          <span className="menu-brand"><MenuIcon name="compass" /> 一座岛，一段新生活</span>
          {ready && <button className="menu-sound" onClick={audio.toggle} aria-label={audio.enabled && audio.started ? '关闭开始界面声音' : '开启开始界面声音'} aria-pressed={audio.enabled && audio.started}>
            <MenuIcon name={audio.enabled ? 'sound' : 'muted'} />
            <span>{audio.enabled ? (audio.started ? '海风已响起' : '轻触听海') : '声音已关闭'}</span>
          </button>}
        </header>
        <main className="menu-content">
          <section className="menu-heading" aria-label="去你的岛">
            <div className="menu-emblem" aria-hidden="true"><MenuIcon name="compass" /></div>
            <p className="menu-eyebrow">A LITTLE ISLAND. A NEW BEGINNING.</p>
            <h1 className="start-title">去你的<span>岛<svg viewBox="0 0 100 12" aria-hidden="true"><path d="M3 8Q48 0 96 6" /></svg></span><i>。</i></h1>
            <p className="start-subtitle">把喧嚣留在岸上。<br />从一无所有，到拥有自己的小岛。</p>
          </section>
          <section className="menu-actions" aria-label="开始冒险">
            {notice && <p className="start-notice" role="status">{notice}</p>}
            {ready ? <>
              <div className="menu-save-label"><span>{hasSave ? '你的岛，还在等你' : '下一站，自由'}</span><span>{hasSave ? `已生存 ${savedGame.day ?? 1} 天` : '采集 / 建造 / 生存'}</span></div>
              <button className="start-button" onClick={() => requestStart(hasSave ? 'continue' : 'new')}>
                <span><strong>{hasSave ? '继续游戏' : '开始游戏'}</strong><small>{hasSave ? '回到熟悉的海风里' : '向着属于你的岛，出发'}</small></span><MenuIcon name="arrow" />
              </button>
              <div className="start-mp">
                <button className="mp-button" onClick={() => onMultiplayer('host')}><MenuIcon name="flag" /><span>创建房间<small>邀朋友一起生存</small></span></button>
                <button className="mp-button" onClick={() => onMultiplayer('guest')}><MenuIcon name="people" /><span>加入房间<small>赴一场海岛之约</small></span></button>
              </div>
              <div className="menu-utilities">
                <button className="profile-chip" onClick={() => { setPendingStart(null); setShowSetup(true); }}><MenuIcon name="user" />设置形象</button>
                {hasSave && <button className="new-game-button" onClick={startNew}>开新档</button>}
                {legacy && <button className="legacy-button" onClick={() => setShowMeta(true)}>荒岛传承</button>}
              </div>
            </> : <p className="start-loading" role="status">正在寻找你的岛…</p>}
          </section>
        </main>
        <footer className="menu-footer"><span>慢慢生活，好好活着。</span><span>EXPLORE · CRAFT · SURVIVE</span></footer>
      </div>
      {abandoning && (
        <div className="abandon-mask">
          <div className="abandon-panel" role="dialog" aria-modal="true" aria-labelledby="abandon-title">
            <h3 className="abandon-title" id="abandon-title">放弃这座岛?</h3>
            <p className="abandon-text">
              本局已生存 {abandoning.save.day ?? 1} 天,重开将沉淀 {abandoning.points} 求生心得,
              <br />
              岛上的进度与物品都会消失。
            </p>
            <div className="abandon-actions">
              <button className="abandon-cancel" onClick={() => setAbandoning(null)}>
                再想想
              </button>
              <button className="abandon-confirm" onClick={confirmAbandon}>
                重新开始
              </button>
            </div>
          </div>
        </div>
      )}
      {showMeta && <MetaPanel onClose={() => setShowMeta(false)} />}
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
            if (mode) onStart(mode);
          }}
          onCancel={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}
