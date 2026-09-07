'use client';

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
        background: 'rgba(6, 10, 8, 0.88)',
        fontFamily: 'sans-serif',
        animation: 'death-fade 0.3s ease',
      }}
      onClick={onClose}
    >
      <div style={{ color: '#dce8df', fontSize: 15 }}>长按或右键保存图片,分享你的战绩</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="荒岛生涯战绩卡"
        style={{ width: 'min(78vw, 340px)', borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
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
          border: 'none',
          borderRadius: 12,
          background: 'linear-gradient(#8aa88f, #5f7d64)',
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '0.1em',
          boxShadow: '0 4px 0 #43604a',
          cursor: 'pointer',
        }}
      >
        复制战绩文案
      </button>
      {hint && <div style={{ color: '#cfe0d2', fontSize: 13 }}>{hint}</div>}
    </div>
  );
}

export function DeathScreen({
  onConfirm,
  autoRespawn = false,
  respawnLeft = null,
  report = null,
}: {
  onConfirm: () => void;
  autoRespawn?: boolean;
  /** 联机复活倒计时剩余秒数(房主权威下发),驱动倒计时数字动态变化 */
  respawnLeft?: number | null;
  /** 单机死亡的战绩快照(联机自动复活时为 null) */
  report?: DeathReport | null;
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
        gap: 'clamp(16px, 4.5vh, 30px)',
        background: 'rgba(10, 14, 12, 0.72)',
        fontFamily: 'sans-serif',
        animation: 'death-fade 0.6s ease',
      }}
    >
      <style>{`
        @keyframes death-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes death-count { from { transform: scale(1.3); opacity: 0.4; } to { transform: scale(1); opacity: 1; } }
      `}</style>
      <div style={{ fontSize: 'clamp(52px, 16vw, 84px)', lineHeight: 1 }}>💀</div>
      <div style={{ color: '#fff', fontSize: 'clamp(22px, 6.5vw, 32px)', letterSpacing: '0.1em' }}>
        {autoRespawn ? '你倒下了…' : '你没能活下来…'}
      </div>
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
                background: 'rgba(255,255,255,0.12)',
                color: '#dce8df',
                fontSize: 'clamp(13px, 3.5vw, 15px)',
                letterSpacing: '0.05em',
              }}
            >
              {text}
            </span>
          ))}
        </div>
      )}
      {autoRespawn ? (
        <div
          key={seconds}
          style={{
            color: '#dce8df',
            fontSize: 'clamp(15px, 4vw, 18px)',
            animation: 'death-count 1s ease',
          }}
        >
          {seconds} 秒后在出生点复活
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {report && (
            <button
              onClick={share}
              disabled={sharing}
              style={{
                minWidth: 'min(60vw, 220px)',
                minHeight: 56,
                border: 'none',
                borderRadius: 16,
                background: 'linear-gradient(#8aa88f, #5f7d64)',
                color: '#fff',
                fontSize: 'clamp(16px, 4.5vw, 20px)',
                fontWeight: 700,
                letterSpacing: '0.2em',
                boxShadow: '0 5px 0 #43604a',
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
              minHeight: 56,
              border: 'none',
              borderRadius: 16,
              background: report ? 'rgba(255,255,255,0.1)' : 'linear-gradient(#8aa88f, #5f7d64)',
              color: report ? '#dce8df' : '#fff',
              fontSize: 'clamp(16px, 4.5vw, 20px)',
              fontWeight: 700,
              letterSpacing: '0.2em',
              boxShadow: report ? 'none' : '0 5px 0 #43604a',
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
