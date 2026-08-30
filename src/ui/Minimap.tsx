'use client';

import { useEffect, useRef, useState } from 'react';
import type { GroundKind, MinimapSnapshot } from '@/game/systems/MinimapSystem';

/** 小地图从 Game 拉取数据所需的最小接口 */
export type MinimapSource = {
  getMinimapSnapshot(): MinimapSnapshot;
  getGroundKind(x: number, z: number): GroundKind;
};

const GROUND_COLORS: Record<GroundKind, string> = {
  water: '#4d9ddb',
  sand: '#e8d6a0',
  grass: '#7aa85c',
  dark: '#4e7a3f',
};

const MARKER_STYLE: Record<string, { icon: string; label: string }> = {
  workbench: { icon: '🛠️', label: '工作台' },
  campfire: { icon: '🔥', label: '火堆' },
  bed: { icon: '🛏️', label: '床' },
};

/** 底图分辨率(采样一次后缓存,不随帧重绘) */
const BASE_RES = 128;
/** 迷雾颜色:未探索区域整体盖住 */
const FOG_COLOR = [16, 24, 36, 235] as const;

/**
 * 右上角小地图:
 * - 战争迷雾——只有玩家走过(周围一圈)的区域可见,地形与标记都不透出;
 * - 点击地图放大查看,放大后有文字标注(工作台/火堆/床);
 * - 地图左上角有折叠按钮,可收起只留按钮。
 */
export function Minimap({ source }: { source: MinimapSource | null }) {
  // 默认收起,只留右上角小按钮,点开才显示地图
  const [folded, setFolded] = useState(true);
  const [enlarged, setEnlarged] = useState(false);
  const smallRef = useRef<HTMLCanvasElement>(null);
  const bigRef = useRef<HTMLCanvasElement>(null);
  // 底图(岛屿地形)按世界种子采样一次后缓存
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const islandSizeRef = useRef(0);

  useEffect(() => {
    if (!source) return;
    let raf = 0;
    const render = () => {
      const snap = source.getMinimapSnapshot();
      if (snap.islandSize !== islandSizeRef.current) {
        islandSizeRef.current = snap.islandSize;
        baseRef.current = buildBase(source, snap.islandSize);
      }
      const base = baseRef.current;
      if (base) {
        if (!folded) draw(smallRef.current, base, snap, false);
        if (enlarged) draw(bigRef.current, base, snap, true);
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [source, folded, enlarged]);

  if (!source) return null;

  // 折叠后只留右上角一个小按钮
  if (folded) {
    return (
      <button
        onClick={() => setFolded(false)}
        aria-label="展开小地图"
        style={{
          position: 'absolute',
          top: 'max(10px, env(safe-area-inset-top))',
          right: 'max(10px, env(safe-area-inset-right))',
          width: 38,
          height: 38,
          fontSize: 17,
          lineHeight: 1,
          border: 'none',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.75)',
          cursor: 'pointer',
          zIndex: 20,
        }}
      >
        🗺️
      </button>
    );
  }

  const smallSize = 'min(34vw, 132px)';

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 'max(10px, env(safe-area-inset-top))',
          right: 'max(10px, env(safe-area-inset-right))',
          zIndex: 20,
        }}
      >
        <div style={{ position: 'relative' }}>
          <canvas
            ref={smallRef}
            onClick={() => setEnlarged(true)}
            style={{
              display: 'block',
              width: smallSize,
              height: smallSize,
              borderRadius: 10,
              border: '2px solid rgba(255,255,255,0.85)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              cursor: 'pointer',
            }}
          />
          {/* 折叠按钮:固定在小地图左上角 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFolded(true);
            }}
            aria-label="收起小地图"
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              width: 22,
              height: 22,
              fontSize: 13,
              lineHeight: 1,
              padding: 0,
              border: 'none',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.85)',
              color: '#4a3b2a',
              cursor: 'pointer',
            }}
          >
            −
          </button>
        </div>
      </div>
      {enlarged && (
        <div
          onClick={() => setEnlarged(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
            fontFamily: 'sans-serif',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
          >
            <canvas
              ref={bigRef}
              style={{
                display: 'block',
                width: 'min(86vw, 420px)',
                height: 'min(86vw, 420px)',
                borderRadius: 14,
                border: '3px solid rgba(255,255,255,0.9)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
              }}
            />
            <div style={{ color: '#fff', fontSize: 14, opacity: 0.85 }}>点击空白处关闭</div>
          </div>
        </div>
      )}
    </>
  );
}

/** 采样整座岛的地形生成底图(只在岛屿尺寸变化时执行一次) */
function buildBase(source: MinimapSource, islandSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = BASE_RES;
  canvas.height = BASE_RES;
  const ctx = canvas.getContext('2d')!;
  const half = islandSize / 2;
  for (let py = 0; py < BASE_RES; py++) {
    for (let px = 0; px < BASE_RES; px++) {
      const x = (px / BASE_RES) * islandSize - half;
      const z = (py / BASE_RES) * islandSize - half;
      ctx.fillStyle = GROUND_COLORS[source.getGroundKind(x, z)];
      ctx.fillRect(px, py, 1, 1);
    }
  }
  return canvas;
}

/** 世界坐标 → 画布像素 */
function toPixel(v: number, islandSize: number, canvasSize: number): number {
  return ((v + islandSize / 2) / islandSize) * canvasSize;
}

/** 把一帧快照画到目标画布:底图 + 迷雾 + 标记 + 玩家;放大时带文字标注 */
function draw(
  canvas: HTMLCanvasElement | null,
  base: HTMLCanvasElement,
  snap: MinimapSnapshot,
  withLabels: boolean
): void {
  if (!canvas) return;
  const cssSize = canvas.clientWidth;
  if (cssSize === 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = Math.round(cssSize * dpr);
  if (canvas.width !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(base, 0, 0, size, size);

  // 迷雾:网格铺成一张小图再放大,得到柔和的探索边缘
  const fog = document.createElement('canvas');
  fog.width = snap.gridLen;
  fog.height = snap.gridLen;
  const fctx = fog.getContext('2d')!;
  const img = fctx.createImageData(snap.gridLen, snap.gridLen);
  for (let i = 0; i < snap.explored.length; i++) {
    if (!snap.explored[i]) {
      img.data[i * 4] = FOG_COLOR[0];
      img.data[i * 4 + 1] = FOG_COLOR[1];
      img.data[i * 4 + 2] = FOG_COLOR[2];
      img.data[i * 4 + 3] = FOG_COLOR[3];
    }
  }
  fctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(fog, 0, 0, size, size);

  // 建筑标记(已在快照里过滤为仅已探索区域)
  const iconSize = withLabels ? size * 0.06 : Math.max(size * 0.09, 11);
  ctx.font = `${iconSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const m of snap.markers) {
    const style = MARKER_STYLE[m.kind];
    if (!style) continue;
    const x = toPixel(m.x, snap.islandSize, size);
    const y = toPixel(m.z, snap.islandSize, size);
    ctx.fillText(style.icon, x, y);
    if (withLabels) {
      ctx.font = `600 ${iconSize * 0.6}px sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText(style.label, x + 1, y + iconSize * 0.85 + 1);
      ctx.fillStyle = '#fff';
      ctx.fillText(style.label, x, y + iconSize * 0.85);
      ctx.font = `${iconSize}px sans-serif`;
      ctx.fillStyle = '#000';
    }
  }

  // 玩家:白心蓝圈圆点
  const px = toPixel(snap.player.x, snap.islandSize, size);
  const py = toPixel(snap.player.z, snap.islandSize, size);
  const r = Math.max(size * 0.025, 4);
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#2471a3';
  ctx.lineWidth = r * 0.4;
  ctx.fill();
  ctx.stroke();
}
