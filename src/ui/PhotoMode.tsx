'use client';

import { gameTheme, gameDarkTheme, gameDarkButtonStyle } from './gameTheme';

import { useEffect, useRef, useState } from 'react';
import type { Game } from '@/game/Game';
import { randomPhotoCaption, renderPhotoCard, sharePhotoCard } from './photoCard';

/** 控制圆钮通用样式:HUD 同款奶油底与细描边 */
const ROUND_BTN: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  border: gameTheme.border,
  background: gameTheme.panel,
  color: gameTheme.ink,
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/**
 * 相机模式(拍照模式):隐藏全部玩法 UI 后的全屏取景层。
 * 手势:单指拖动平移、双指捏合缩放、双指旋转视角;
 * 控件:退出、放大/缩小、左旋/右旋与快门;拍照后进入预览可分享/保存。
 */
export function PhotoMode({ game, day, onClose }: { game: Game; day: number; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [flash, setFlash] = useState(false);
  // 拍照结果:合成中的分享卡 objectURL 与对应文案
  const [shot, setShot] = useState<{ url: string; caption: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState('');

  // 手势状态:当前触点集合 + 单指拖动起点 / 双指捏合基线
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panFrom = useRef<{ x: number; y: number } | null>(null);
  const pinchBase = useRef<{ dist: number; angle: number; midY: number } | null>(null);

  const zoomBy = (factor: number) => setZoom(game.photoZoomBy(factor));
  /** 双指上下滑动换算俯仰增量:上滑抬高视角(约 200px 走满全程) */
  const pitchBy = (dyPx: number) => game.photoRotatePitch(-dyPx * 0.005);

  /** 根据当前触点集合重建手势基线(触点数变化后调用) */
  const rebase = () => {
    const pts = [...pointers.current.values()];
    if (pts.length === 0) {
      panFrom.current = null;
      pinchBase.current = null;
    } else if (pts.length === 1) {
      panFrom.current = { x: pts[0].x, y: pts[0].y };
      pinchBase.current = null;
    } else {
      panFrom.current = null;
      const [a, b] = pts;
      pinchBase.current = {
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        midY: (a.y + b.y) / 2,
      };
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    rebase();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    const pts = [...pointers.current.values()];
    if (pts.length >= 2 && pinchBase.current) {
      const [a, b] = pts;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      let angle = Math.atan2(b.y - a.y, b.x - a.x);
      const midY = (a.y + b.y) / 2;
      let dAngle = angle - pinchBase.current.angle;
      if (dAngle > Math.PI) dAngle -= Math.PI * 2;
      if (dAngle < -Math.PI) dAngle += Math.PI * 2;
      if (pinchBase.current.dist > 0) zoomBy(dist / pinchBase.current.dist);
      if (Math.abs(dAngle) > 0.01) game.photoRotate(dAngle);
      if (Math.abs(midY - pinchBase.current.midY) > 0.5) pitchBy(midY - pinchBase.current.midY);
      pinchBase.current = { dist, angle, midY };
    } else if (pts.length === 1 && panFrom.current) {
      game.photoPan(p.x - panFrom.current.x, p.y - panFrom.current.y);
      panFrom.current = { x: p.x, y: p.y };
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    rebase();
  };

  // 关闭预览时释放合成卡片占用的 objectURL
  useEffect(() => {
    return () => {
      if (shot) URL.revokeObjectURL(shot.url);
    };
  }, [shot]);

  const takePhoto = () => {
    if (busy) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    setBusy(true);
    game.requestPhoto((photo) => {
      if (!photo) {
        setBusy(false);
        setTip('拍照失败,请重试');
        return;
      }
      const caption = randomPhotoCaption(day);
      void renderPhotoCard(photo, caption, day)
        .then((blob) => setShot({ url: URL.createObjectURL(blob), caption }))
        .catch(() => setTip('生成照片失败,请重试'))
        .finally(() => setBusy(false));
    });
  };

  const closeShot = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    setTip('');
  };

  const share = async () => {
    if (!shot) return;
    const ok = await sharePhotoCard(await fetchBlob(shot.url), shot.caption);
    setTip(ok ? '' : '当前浏览器不支持直接分享,请长按图片保存');
  };

  const save = () => {
    if (!shot) return;
    const a = document.createElement('a');
    a.href = shot.url;
    a.download = `island-day${day}.png`;
    a.click();
    setTip('已保存,也可长按图片存到相册');
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, fontFamily: 'sans-serif' }}>
      {/* 手势取景层(控件之上兄弟层,按钮后渲染优先接收事件) */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ position: 'absolute', inset: 0, touchAction: 'none', userSelect: 'none' }}
      />

      {/* 快门白闪 */}
      {flash && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#fff',
            animation: 'photo-flash 180ms ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 顶部:退出 + 缩放倍率 */}
      <div
        style={{
          position: 'absolute',
          top: 'max(12px, env(safe-area-inset-top))',
          left: 'max(12px, env(safe-area-inset-left))',
          right: 'max(12px, env(safe-area-inset-right))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <button onClick={onClose} aria-label="退出相机模式" style={{ ...ROUND_BTN, pointerEvents: 'auto' }}>
          ✕
        </button>
        <span
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            background: gameTheme.panel,
            border: gameTheme.border,
            color: gameTheme.ink,
            fontSize: 14,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {zoom.toFixed(1)}×
        </span>
      </div>

      {/* 底部:手势提示 + 快门(全部取景操作均由手势完成) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 'max(20px, env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          pointerEvents: 'none',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
          拖动移机 · 双指缩放 / 旋转 / 俯仰
        </span>
        <button
          onClick={takePhoto}
          aria-label="拍照"
          disabled={busy}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: '4px solid #fff',
            background: busy ? 'rgba(255,255,255,0.5)' : '#fff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
        />
      </div>

      {/* 拍照结果预览:深色暗场衬托照片,分享卡大图 + 分享/保存/重拍 */}
      {shot && (
        <div
          onClick={closeShot}
          style={{
            position: 'absolute',
            inset: 0,
            background: gameDarkTheme.panel, overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 20,
          }}
        >
          <img
            src={shot.url}
            alt="荒岛照片"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '55dvh', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
          />
          <div style={{ color: gameDarkTheme.ink, fontSize: 15, textAlign: 'center' }}>{shot.caption}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => void share()}
              style={{ padding: '12px 20px', fontSize: 15, fontWeight: 600, ...gameDarkButtonStyle, borderRadius: 10, cursor: 'pointer' }}
            >
              分享
            </button>
            <button
              onClick={save}
              style={{ padding: '12px 20px', fontSize: 15, fontWeight: 600, ...gameDarkButtonStyle, borderRadius: 10, cursor: 'pointer' }}
            >
              保存
            </button>
            <button
              onClick={closeShot}
              style={{ padding: '12px 20px', fontSize: 15, ...gameDarkButtonStyle, background: 'transparent', borderRadius: 10, cursor: 'pointer' }}
            >
              重拍
            </button>
          </div>
          {tip && <span style={{ color: gameDarkTheme.warning, background: gameDarkTheme.surface, borderRadius: 10, padding: 6, fontSize: 13 }}>{tip}</span>}
        </div>
      )}

      {!shot && tip && (
        <div
          style={{
            position: 'absolute',
            bottom: 150,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: gameTheme.warning, background: gameTheme.surface, borderRadius: 10, padding: 6,
            fontSize: 13,
            pointerEvents: 'none',
          }}
        >
          {tip}
        </div>
      )}

      <style>{`@keyframes photo-flash { from { opacity: 0.9 } to { opacity: 0 } }`}</style>
    </div>
  );
}

/** objectURL 转回 Blob 供系统分享 */
async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  return await res.blob();
}
