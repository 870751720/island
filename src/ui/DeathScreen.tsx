'use client';

import { gameTheme, gameButtonStyle } from './gameTheme';

import { useState } from 'react';
import type { DeathReport } from '@/game/systems/RunStats';
import { deathReportText, renderDeathCard, shareDeathCard } from './shareCard';

/** 分享降级弹层:不支持文件分享的平台(桌面浏览器等)直接展示卡片图片,长按/右键保存 */
function CardFallback({ url, report, onClose }: { url: string; report: DeathReport; onClose: () => void }) {
  const [hint, setHint] = useState<string | null>(null);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        background: gameTheme.panel,
        fontFamily: gameTheme.font,
        overflowY: 'auto',
        padding: '16px',
        boxSizing: 'border-box',
        animation: 'death-fade 0.3s ease',
      }}
      onClick={onClose}
    >
      <div style={{ color: gameTheme.ink, fontSize: 15 }}>长按或右键保存图片,分享你的战绩</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="荒岛生涯战绩卡"
        style={{ width: 'min(78vw, 340px)', maxHeight: '65dvh', objectFit: 'contain', borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
      />
      <button
        onClick={async (e) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(deathReportText(report));
            setHint('战绩文案已复制');
          } catch {
            setHint('复制失败,请手动保存图片');
          }
        }}
        style={{
          minHeight: 44,
          padding: '0 22px',
          ...gameButtonStyle,
          borderRadius: 12,
          background: gameTheme.action,
          color: gameTheme.ink,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '0.1em',
          boxShadow: gameTheme.controlShadow,
          cursor: 'pointer',
        }}
      >
        复制战绩文案
      </button>
      {hint && <div style={{ color: gameTheme.muted, fontSize: 13 }}>{hint}</div>}
    </div>
  );
}

export function DeathScreen({
  onConfirm,
  autoRespawn = false,
  respawnLeft = null,
  report = null,
  poseidon = false,
}: {
  onConfirm: () => void;
  autoRespawn?: boolean;
  /** 联机复活倒计时剩余秒数(房主权威下发),驱动倒计时数字动态变化 */
  respawnLeft?: number | null;
  /** 单机死亡的战绩快照(联机自动复活时为 null) */
  report?: DeathReport | null;
  /** 波塞冬的庇佑触发中:界面切换为海洋主题,明确告知玩家被海神复活 */
  poseidon?: boolean;
}) {
  const seconds = Math.max(1, Math.ceil(respawnLeft ?? 3));
  const [sharing, setSharing] = useState(false);
  const [fallback, setFallback] = useState<{ url: string } | null>(null);

  const share = async () => {
    if (!report || sharing) return;
    setSharing(true);
    try {
      const blob = await renderDeathCard(report);
      const shared = await shareDeathCard(blob, report);
      if (!shared) setFallback({ url: URL.createObjectURL(blob) });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(10px, 2.5vh, 24px)',
        background: poseidon
          ? 'linear-gradient(145deg,#f4f5dcf5,#c8e5ddf2)'
          : gameTheme.panel,
        fontFamily: gameTheme.font,
        overflowY: 'auto',
        padding: '16px',
        boxSizing: 'border-box',
        animation: 'death-fade 0.6s ease',
      }}
    >
      <style>{`
        @keyframes death-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes death-count { from { transform: scale(1.3); opacity: 0.4; } to { transform: scale(1); opacity: 1; } }
        @keyframes poseidon-glow { 0%, 100% { text-shadow: 0 0 12px rgba(46, 196, 182, 0.9), 0 0 34px rgba(46, 196, 182, 0.5); } 50% { text-shadow: 0 0 22px rgba(46, 196, 182, 1), 0 0 56px rgba(46, 196, 182, 0.8); } }
        @keyframes poseidon-rise { 0% { transform: translateY(14px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
      `}</style>
      {poseidon ? (
        <div
          style={{
            fontSize: 'clamp(52px, 16vw, 84px)',
            lineHeight: 1,
            animation: 'poseidon-glow 2.2s ease-in-out infinite',
          }}
        >
          🔱
        </div>
      ) : (
        <div style={{ fontSize: 'clamp(52px, 16vw, 84px)', lineHeight: 1 }}>💀</div>
      )}
      <div
        style={{
          color: poseidon ? '#367b73' : gameTheme.ink,
          fontSize: 'clamp(22px, 6.5vw, 32px)',
          letterSpacing: '0.1em',
          animation: poseidon ? 'poseidon-rise 0.8s ease' : undefined,
        }}
      >
        {poseidon ? '波塞冬的庇佑' : autoRespawn ? '你倒下了…' : '你没能活下来…'}
      </div>
      {poseidon && (
        <div
          style={{
            color: gameTheme.ink,
            fontSize: 'clamp(15px, 4vw, 18px)',
            lineHeight: 1.7,
            textAlign: 'center',
            maxWidth: '82vw',
            animation: 'poseidon-rise 0.9s ease',
          }}
        >
          海神从浪涛中托起了你,海浪正把你送回出生点,
          <br />
          身旁还留下了一只装着装备与信件的木箱…
        </div>
      )}
      {report && !autoRespawn && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: '86vw',
          }}
        >
          {[
            `第 ${report.day} 天`,
            `击杀 ${report.kills}`,
            `采集 ${report.collected}`,
            `建造 ${report.built}`,
            `合成 ${report.crafted}`,
          ].map((text) => (
            <span
              key={text}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                background: gameTheme.surface,
                color: gameTheme.ink,
                fontSize: 'clamp(13px, 3.5vw, 15px)',
                letterSpacing: '0.05em',
              }}
            >
              {text}
            </span>
          ))}
        </div>
      )}
      {report && !autoRespawn && report.legacyPoints > 0 && (
        <div
          style={{
            padding: '8px 20px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(247,215,116,0.22), rgba(247,215,116,0.1))',
            border: '1px solid rgba(247,215,116,0.45)',
            color: gameTheme.warning,
            fontSize: 'clamp(14px, 3.8vw, 16px)',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          求生心得 +{report.legacyPoints}(生存了 {report.day} 天)
        </div>
      )}
      {report && !autoRespawn && report.legacyPoints === 0 && (
        <p style={{ margin: 0, color: gameTheme.muted, fontSize: 'clamp(12px, 3.2vw, 14px)' }}>
          生存不足 2 天,没有沉淀下求生心得
        </p>
      )}
      {autoRespawn ? (
        <div
          key={seconds}
          style={{
            color: poseidon ? '#367b73' : gameTheme.ink,
            fontSize: 'clamp(15px, 4vw, 18px)',
            animation: 'death-count 1s ease',
          }}
        >
          {seconds} 秒后在出生点{poseidon ? '苏醒' : '复活'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {report && (
            <button
              onClick={share}
              disabled={sharing}
              style={{
                minWidth: 'min(60vw, 220px)',
                ...gameButtonStyle,
                minHeight: 56,
                borderRadius: 16,
                background: gameTheme.action,
                color: gameTheme.ink,
                fontSize: 'clamp(16px, 4.5vw, 20px)',
                fontWeight: 700,
                letterSpacing: '0.2em',
                boxShadow: gameTheme.controlShadow,
                cursor: sharing ? 'default' : 'pointer',
                opacity: sharing ? 0.6 : 1,
              }}
            >
              {sharing ? '生成中…' : '分享战绩'}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              minWidth: 'min(60vw, 220px)',
              ...gameButtonStyle,
              minHeight: 56,
              borderRadius: 16,
              background: report ? gameTheme.inset : gameTheme.action,
              color: gameTheme.ink,
              fontSize: 'clamp(16px, 4.5vw, 20px)',
              fontWeight: 700,
              letterSpacing: '0.2em',
              boxShadow: report ? 'none' : gameTheme.controlShadow,
              cursor: 'pointer',
            }}
          >
            确 认
          </button>
        </div>
      )}
      {fallback && report && (
        <CardFallback url={fallback.url} report={report} onClose={() => setFallback(null)} />
      )}
    </div>
  );
}
