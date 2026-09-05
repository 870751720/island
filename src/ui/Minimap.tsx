'use client';

import { useEffect, useRef, useState } from 'react';
import type { GroundKind, MinimapSnapshot } from '@/game/systems/MinimapSystem';
import { fadeStyle } from './fade';

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

/** 底图长边分辨率(采样一次后缓存,不随帧重绘;越高海岸线越锐利) */
const BASE_RES = 512;
/** 迷雾颜色:未探索区域整体盖住 */
const FOG_COLOR = [16, 24, 36, 235] as const;

/**
 * 右上角小地图(定位由外层容器负责):
 * - 地图形状与岛屿同比例(长条岛显示为竖长地图);
 * - 战争迷雾——只有玩家走过(周围一圈)的区域可见,地形与标记都不透出;
 * - 点击地图放大查看,放大后有文字标注(工作台/火堆/床)与其他玩家昵称;
 * - 大地图关闭时自动收起小地图(回到右上角按钮态)。
 */

/** 折叠态按钮上的地图图标(描边风格,浅色线条适配浅底) */
function MapIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4.5 3.5 6.6v13L9 17.4l6 2.1 5.5-2.1v-13L15 6.6 9 4.5Z"
        stroke="#4a6b8a"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="rgba(116,163,203,0.35)"
      />
      <path d="M9 4.5v12.9M15 6.6v12.9" stroke="#4a6b8a" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="11" r="1.7" fill="#e67e22" stroke="#fff" strokeWidth="0.9" />
    </svg>
  );
}
export function Minimap({ source, dimmed = false }: { source: MinimapSource | null; dimmed?: boolean }) {
  // 默认收起,只留右上角小按钮,点开才显示地图
  const [folded, setFolded] = useState(true);
  const [enlarged, setEnlarged] = useState(false);
  const smallRef = useRef<HTMLCanvasElement>(null);
  const bigRef = useRef<HTMLCanvasElement>(null);
  // 底图(岛屿地形)按世界种子采样一次后缓存
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const baseKeyRef = useRef('');

  useEffect(() => {
    if (!source) return;
    let raf = 0;
    const render = () => {
      const snap = source.getMinimapSnapshot();
      const key = `${snap.islandWidth}x${snap.islandLength}`;
      if (key !== baseKeyRef.current) {
        baseKeyRef.current = key;
        baseRef.current = buildBase(source, snap.islandWidth, snap.islandLength);
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

  const aspect = (() => {
    const snap = source.getMinimapSnapshot();
    return `${snap.islandWidth} / ${snap.islandLength}`;
  })();

  // 折叠后只留一个小按钮
  if (folded) {
    return (
      <button
        onClick={() => setFolded(false)}
        aria-label="展开小地图"
        style={{
          width: 42,
          height: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.78)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          cursor: 'pointer',
          ...fadeStyle(dimmed),
        }}
      >
        <MapIcon size={24} />
      </button>
    );
  }

  return (
    <>
      <div>
        <canvas
          ref={smallRef}
          onClick={() => setEnlarged(true)}
          style={{
            display: 'block',
            width: 'min(30vw, 116px)',
            aspectRatio: aspect,
            borderRadius: 10,
            border: '2px solid rgba(255,255,255,0.85)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            cursor: 'pointer',
          }}
        />
      </div>
      {enlarged && (
        <div
          onClick={() => {
            setEnlarged(false);
            // 大地图关闭时自动收起小地图,回到右上角按钮态
            setFolded(true);
          }}
        style={{
          position: 'fixed',
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
                maxHeight: '86vh',
                aspectRatio: aspect,
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

/** 采样整座岛的地形生成底图(只在岛屿尺寸变化时执行一次);画布宽高与岛屿同比例 */
function buildBase(source: MinimapSource, islandWidth: number, islandLength: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(16, Math.round((BASE_RES * islandWidth) / islandLength));
  canvas.height = BASE_RES;
  const ctx = canvas.getContext('2d')!;
  const hw = islandWidth / 2;
  const hl = islandLength / 2;
  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const x = (px / canvas.width) * islandWidth - hw;
      const z = (py / canvas.height) * islandLength - hl;
      ctx.fillStyle = GROUND_COLORS[source.getGroundKind(x, z)];
      ctx.fillRect(px, py, 1, 1);
    }
  }
  return canvas;
}

/** 世界坐标 → 画布像素(横纵各自按岛屿宽高换算) */
function toPixelX(v: number, islandWidth: number, canvasW: number): number {
  return ((v + islandWidth / 2) / islandWidth) * canvasW;
}
function toPixelY(v: number, islandLength: number, canvasH: number): number {
  return ((v + islandLength / 2) / islandLength) * canvasH;
}

/** 把一帧快照画到目标画布:底图 + 迷雾 + 标记 + 玩家;放大时带文字标注 */
function draw(
  canvas: HTMLCanvasElement | null,
  base: HTMLCanvasElement,
  snap: MinimapSnapshot,
  withLabels: boolean
): void {
  if (!canvas) return;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (cssW === 0 || cssH === 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(cssW * dpr);
  const h = Math.round(cssH * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(base, 0, 0, w, h);

  // 迷雾:网格铺成一张小图再放大,得到柔和的探索边缘
  const fog = document.createElement('canvas');
  fog.width = snap.gridW;
  fog.height = snap.gridL;
  const fctx = fog.getContext('2d')!;
  const img = fctx.createImageData(snap.gridW, snap.gridL);
  for (let i = 0; i < snap.explored.length; i++) {
    if (!snap.explored[i]) {
      img.data[i * 4] = FOG_COLOR[0];
      img.data[i * 4 + 1] = FOG_COLOR[1];
      img.data[i * 4 + 2] = FOG_COLOR[2];
      img.data[i * 4 + 3] = FOG_COLOR[3];
    }
  }
  fctx.putImageData(img, 0, 0);
  // 迷雾边缘用硬边(最近邻,不做插值柔化)
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(fog, 0, 0, w, h);

  // 建筑标记(已在快照里过滤为仅已探索区域);图标尺寸按画布短边取,避免长图上过小
  const size = Math.min(w, h);
  const iconSize = withLabels ? size * 0.06 : Math.max(size * 0.09, 11);
  ctx.font = `${iconSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const m of snap.markers) {
    const style = MARKER_STYLE[m.kind];
    if (!style) continue;
    const x = toPixelX(m.x, snap.islandWidth, w);
    const y = toPixelY(m.z, snap.islandLength, h);
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

  // 其他联机玩家:橙心白圈圆点,放大时带昵称
  for (const o of snap.others) {
    const [ox, oy] = playerMapPoint(o.x, o.z, snap, w, h);
    const or = Math.max(size * 0.02, 3.5);
    ctx.beginPath();
    ctx.arc(ox, oy, or, 0, Math.PI * 2);
    ctx.fillStyle = '#e67e22';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = or * 0.45;
    ctx.fill();
    ctx.stroke();
    if (withLabels) {
      ctx.font = `600 ${Math.max(size * 0.035, 12)}px sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText(o.name, ox + 1, oy + or * 1.8 + 1);
      ctx.fillStyle = '#ffd9b3';
      ctx.fillText(o.name, ox, oy + or * 1.8);
    }
  }

  // 本地玩家:白心蓝圈圆点
  const [px, py] = playerMapPoint(snap.player.x, snap.player.z, snap, w, h);
  const r = Math.max(size * 0.025, 4);
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#2471a3';
  ctx.lineWidth = r * 0.4;
  ctx.fill();
  ctx.stroke();
}

/** 远海玩家沿岛心方向投到地图内沿,保留返岛方位。 */
function playerMapPoint(
  x: number,
  z: number,
  snap: MinimapSnapshot,
  w: number,
  h: number
): [number, number] {
  const limitX = snap.islandWidth / 2;
  const limitZ = snap.islandLength / 2;
  const scale = Math.max(1, Math.abs(x) / limitX, Math.abs(z) / limitZ);
  const inset = Math.min(w, h) * 0.06;
  return [
    Math.max(inset, Math.min(w - inset, toPixelX(x / scale, snap.islandWidth, w))),
    Math.max(inset, Math.min(h - inset, toPixelY(z / scale, snap.islandLength, h))),
  ];
}
