'use client';

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
      <path d="M3 7.5 11 4l10 3.5L29 4v20.5L21 28l-10-3.5L3 28Z" fill="#f3df9b" stroke="#624b32" strokeWidth="2" strokeLinejoin="round" />
      <path d="M11 4v20.5M21 7.5V28" fill="none" stroke="#9b7547" strokeWidth="1.8" />
      <path d="m14 15 3-3 4 3.5 4-4" fill="none" stroke="#4f8d66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="15" r="2" fill="#d55342" />
    </svg>
  );
}

const MINI_VIEW_METERS = 180;

function MapSurface({ snapshot, expanded }: { snapshot: MapSnapshot; expanded: boolean }) {
  const local = snapshot.players.find((player) => player.id === snapshot.localPlayerId) ?? snapshot.players[0];
  if (!local) return null;

  const width = expanded ? 340 : 132;
  const height = expanded ? 460 : 132;
  // 小地图保持易读的附近视野；大地图仍以玩家居中，并缩放到能容纳整座岛。
  const farthestIslandX = snapshot.island.width / 2 + Math.abs(local.x);
  const farthestIslandZ = snapshot.island.length / 2 + Math.abs(local.z);
  const scale = expanded
    ? Math.min((width - 24) / (farthestIslandX * 2), (height - 24) / (farthestIslandZ * 2))
    : width / MINI_VIEW_METERS;
  const px = (x: number) => width / 2 + (x - local.x) * scale;
  const py = (z: number) => height / 2 + (z - local.z) * scale;
  const markerSize = expanded ? 8 : 6;
  const labelSize = expanded ? 11 : 8;
  const islandX = px(0);
  const islandY = py(0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      role="img"
      aria-label="以玩家为中心的岛屿地图"
      style={{ display: 'block', background: '#86bed0' }}
    >
      <defs>
        <pattern id={`waves-${expanded}`} width="18" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 6q4-4 8 0t8 0" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1" />
        </pattern>
        <filter id={`shadow-${expanded}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity=".45" />
        </filter>
      </defs>
      <rect width={width} height={height} fill={`url(#waves-${expanded})`} />
      <ellipse
        cx={islandX}
        cy={islandY}
        rx={(snapshot.island.width / 2) * scale}
        ry={(snapshot.island.length / 2) * scale}
        fill="#9dbb6c"
        stroke="#ead394"
        strokeWidth={expanded ? 7 : 4}
      />

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
          height: 'min(76dvh, 560px)',
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
