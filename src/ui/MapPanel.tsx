'use client';

import { useMemo } from 'react';
import type { MapSnapshot } from '@/game/Game';

type MapPanelProps = {
  snapshot: MapSnapshot;
  expanded: boolean;
  onExpand: () => void;
  onClose: () => void;
};

/** 手绘折叠地图图标，避免依赖 emoji 在不同手机上的字体表现。 */
export function MapIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="7" fill="#75b7ca" stroke="#4b6870" strokeWidth="2" />
      <path d="M7 20c2.5-1.2 3.4-3.7 5.8-4.1 1.8-.3 2.5 1 4.1.4 2.2-.8 2-3.4 4.5-3.6 2.7-.2 3.4 2.8 3.6 5.3.2 2.8-1.6 5.8-5.1 6.6-4.6 1-11.4.2-12.9-4.6Z" fill="#a9c978" stroke="#f3dda1" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16 7.2a4.2 4.2 0 0 0-4.2 4.2c0 3.2 4.2 7.2 4.2 7.2s4.2-4 4.2-7.2A4.2 4.2 0 0 0 16 7.2Z" fill="#e45b4d" stroke="#fff5df" strokeWidth="1.4" />
      <circle cx="16" cy="11.4" r="1.5" fill="#fff5df" />
    </svg>
  );
}

const MAP_VIEW_METERS = 60;

const TERRAIN_COLORS = ['#6caec5', '#ead394', '#9dbb6c', '#628c4e', '#4f9dbb'] as const;

/** 把游戏地形的真实采样栅格转为贴图；同一种子只生成一次。 */
function useTerrainImage(snapshot: MapSnapshot): string {
  return useMemo(() => {
    const { columns, rows, pixels } = snapshot.terrain;
    const canvas = document.createElement('canvas');
    canvas.width = columns;
    canvas.height = rows;
    const context = canvas.getContext('2d');
    if (!context) return '';
    const image = context.createImageData(columns, rows);
    const rgb = TERRAIN_COLORS.map((color) => [
      Number.parseInt(color.slice(1, 3), 16),
      Number.parseInt(color.slice(3, 5), 16),
      Number.parseInt(color.slice(5, 7), 16),
    ]);
    for (let index = 0; index < pixels.length; index++) {
      const color = rgb[pixels[index]] ?? rgb[0];
      image.data[index * 4] = color[0];
      image.data[index * 4 + 1] = color[1];
      image.data[index * 4 + 2] = color[2];
      image.data[index * 4 + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL();
  }, [snapshot.terrain]);
}

function MapSurface({ snapshot, expanded }: { snapshot: MapSnapshot; expanded: boolean }) {
  const terrainImage = useTerrainImage(snapshot);
  const local = snapshot.players.find((player) => player.id === snapshot.localPlayerId) ?? snapshot.players[0];
  if (!local) return null;

  const width = expanded ? 340 : 132;
  const height = width;
  // 大小地图使用完全相同的玩家中心与世界范围，大地图只做等比例放大。
  const scale = width / MAP_VIEW_METERS;
  const px = (x: number) => width / 2 + (x - local.x) * scale;
  const py = (z: number) => height / 2 + (z - local.z) * scale;
  const markerSize = expanded ? 8 : 6;
  const labelSize = expanded ? 11 : 8;
  const mapX = px(-snapshot.island.width / 2);
  const mapY = py(-snapshot.island.length / 2);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      role="img"
      aria-label="以玩家为中心的岛屿地图"
      style={{ display: 'block', background: TERRAIN_COLORS[0] }}
    >
      <defs>
        <filter id={`shadow-${expanded}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity=".45" />
        </filter>
      </defs>
      <rect width={width} height={height} fill={TERRAIN_COLORS[0]} />
      {terrainImage && (
        <image
          href={terrainImage}
          x={mapX}
          y={mapY}
          width={snapshot.island.width * scale}
          height={snapshot.island.length * scale}
          preserveAspectRatio="none"
          style={{ imageRendering: 'pixelated' }}
        />
      )}

      {snapshot.workbenches.map((point, index) => (
        <g key={`workbench-${index}`} transform={`translate(${px(point.x)} ${py(point.z)})`} filter={`url(#shadow-${expanded})`}>
          <rect x={-markerSize} y={-markerSize * .55} width={markerSize * 2} height={markerSize * 1.1} rx="2" fill="#8b5a35" stroke="#fff2cf" strokeWidth="1.5" />
          <path d={`M${-markerSize * .65} ${markerSize * .55}v${markerSize * .55}M${markerSize * .65} ${markerSize * .55}v${markerSize * .55}`} stroke="#5d3b24" strokeWidth="2" />
        </g>
      ))}
      {snapshot.beds.map((point, index) => (
        <g key={`bed-${index}`} transform={`translate(${px(point.x)} ${py(point.z)})`} filter={`url(#shadow-${expanded})`}>
          <rect x={-markerSize} y={-markerSize * .65} width={markerSize * 2} height={markerSize * 1.3} rx="2" fill="#e8c88f" stroke="#79573b" strokeWidth="1.5" />
          <rect x={-markerSize * .75} y={-markerSize * .45} width={markerSize * .55} height={markerSize * .55} rx="1" fill="#fff3d5" />
        </g>
      ))}
      {snapshot.campfires.map((point, index) => (
        <g key={`campfire-${index}`} transform={`translate(${px(point.x)} ${py(point.z)})`} filter={`url(#shadow-${expanded})`}>
          <path d={`M0 ${-markerSize * 1.25}C${markerSize} ${-markerSize * .35} ${markerSize * .8} ${markerSize} 0 ${markerSize}C${-markerSize * .8} ${markerSize} ${-markerSize} ${-markerSize * .35} 0 ${-markerSize * 1.25}Z`} fill="#f26b32" stroke="#ffe29a" strokeWidth="1.5" />
        </g>
      ))}

      {snapshot.players.filter((player) => !player.dead).map((player) => {
        const isLocal = player.id === snapshot.localPlayerId;
        return (
          <g key={player.id} transform={`translate(${px(player.x)} ${py(player.z)})`} filter={`url(#shadow-${expanded})`}>
            <circle r={isLocal ? markerSize + 2 : markerSize} fill={isLocal ? '#ffd54f' : '#5b8def'} stroke="#fff" strokeWidth="2" />
            <path d={`M0 ${-markerSize - 5} 3 ${-markerSize} -3 ${-markerSize}Z`} fill={isLocal ? '#6d4c41' : '#284a91'} />
            <text y={markerSize + labelSize + 2} textAnchor="middle" fontFamily="sans-serif" fontSize={labelSize} fontWeight="700" fill="#fff" stroke="rgba(30,40,35,.8)" strokeWidth="2.5" paintOrder="stroke">
              {player.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MapPanel({ snapshot, expanded, onExpand, onClose }: MapPanelProps) {
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onExpand}
        aria-label="打开大地图"
        style={{
          width: 136,
          height: 136,
          padding: 2,
          border: '2px solid rgba(255,255,255,.9)',
          borderRadius: 16,
          overflow: 'hidden',
          background: '#86bed0',
          boxShadow: '0 3px 12px rgba(0,0,0,.3)',
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        <MapSurface snapshot={snapshot} expanded={false} />
      </button>
    );
  }

  return (
    <div
      onPointerDown={onClose}
      aria-label="关闭地图"
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(18,26,24,.48)', display: 'grid', placeItems: 'center', padding: 16 }}
    >
      <div
        onPointerDown={(event) => event.stopPropagation()}
        style={{
          width: 'min(88vw, 390px)',
          aspectRatio: '1',
          padding: 7,
          borderRadius: 22,
          overflow: 'hidden',
          background: '#f4dfaa',
          border: '3px solid #6d5236',
          boxShadow: '0 12px 36px rgba(0,0,0,.5)',
        }}
      >
        <MapSurface snapshot={snapshot} expanded />
      </div>
    </div>
  );
}
