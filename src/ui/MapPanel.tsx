'use client';

import { FACILITY_SVG } from './icons/FacilityIcons';
import { useMemo } from 'react';
import type { MapSnapshot } from '@/game/GameContracts';

type MapPanelProps = {
  snapshot: MapSnapshot;
  onClose: () => void;
};

const MAP_VIEW_METERS = 60;
const FACILITY_MARKER_SIZE = 18;

// 复用背包道具的静态 SVG，数据地址仅在模块加载时生成。
const FACILITY_MARKERS = [
  { source: 'workbenches', kind: 'workbench1', label: '工作台' },
  { source: 'campfires', kind: 'campfire', label: '火堆' },
  { source: 'cookingStations', kind: 'cookingStation', label: '烹饪台' },
] as const;
const FACILITY_IMAGES = FACILITY_MARKERS.map((marker) => ({
  ...marker,
  href: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(FACILITY_SVG[marker.kind]!.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}`,
}));

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

export function MapSurface({ snapshot, compact = false }: { snapshot: MapSnapshot; compact?: boolean }) {
  const terrainImage = useTerrainImage(snapshot);
  const local = snapshot.players.find((player) => player.id === snapshot.localPlayerId) ?? snapshot.players[0];
  if (!local) return null;

  const width = compact ? 44 : 132;
  const height = width;
  const scale = width / MAP_VIEW_METERS;
  const px = (x: number) => width / 2 + (x - local.x) * scale;
  const py = (z: number) => height / 2 + (z - local.z) * scale;
  const markerSize = compact ? 2 : 6;
  const labelSize = 8;
  const mapX = px(-snapshot.island.width / 2);
  const mapY = py(-snapshot.island.length / 2);

  // 超出可视范围的标记沿相对玩家的方位角吸附到地图边缘，保留方向信息。
  const edge = width / 2 - (compact ? 8 : FACILITY_MARKER_SIZE / 2 + 2);
  const anchored = (x: number, z: number) => {
    const dx = (x - local.x) * scale;
    const dz = (z - local.z) * scale;
    const reach = Math.max(Math.abs(dx), Math.abs(dz));
    if (reach <= edge) return { x: width / 2 + dx, z: height / 2 + dz, outside: false };
    const t = edge / reach;
    return { x: width / 2 + dx * t, z: height / 2 + dz * t, outside: true };
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      role="img"
      aria-label="以玩家为中心的岛屿地图"
      style={{ display: 'block', background: TERRAIN_COLORS[0] }}
    >
      {!compact && <defs>
        <filter id="map-marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity=".45" />
        </filter>
      </defs>}
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

      {FACILITY_IMAGES.flatMap(({ source, label, href }) => snapshot[source].map((point, index) => {
        const anchor = anchored(point.x, point.z);
        if (compact) {
          if (anchor.outside) return null;
          return <circle key={`${source}-${index}`} cx={anchor.x} cy={anchor.z} r={1.5} fill="#765139" stroke="#fff4d6" strokeWidth={.6} />;
        }
        return (
          <g key={`${source}-${index}`} transform={`translate(${anchor.x} ${anchor.z})`} filter="url(#map-marker-shadow)" opacity={anchor.outside ? .55 : 1}>
            <title>{label}</title>
            <image href={href} x={-FACILITY_MARKER_SIZE / 2} y={-FACILITY_MARKER_SIZE / 2} width={FACILITY_MARKER_SIZE} height={FACILITY_MARKER_SIZE} />
          </g>
        );
      }))}

      {snapshot.players.filter((player) => !player.dead).map((player) => {
        const isLocal = player.id === snapshot.localPlayerId;
        const anchor = anchored(player.x, player.z);
        return (
          <g key={player.id} transform={`translate(${anchor.x} ${anchor.z})`} filter={compact ? undefined : "url(#map-marker-shadow)"} opacity={anchor.outside && !isLocal ? .8 : 1}>
            <circle r={isLocal ? markerSize + (compact ? .5 : 2) : markerSize} fill={isLocal ? '#ffd54f' : '#5b8def'} stroke="#fff" strokeWidth={compact ? 1 : 2} />
            {!compact && <path d={`M0 ${-markerSize - 5} 3 ${-markerSize} -3 ${-markerSize}Z`} fill={isLocal ? '#6d4c41' : '#284a91'} />}
            {!compact && <text y={markerSize + labelSize + 2} textAnchor="middle" fontFamily="sans-serif" fontSize={labelSize} fontWeight="700" fill="#fff" stroke="rgba(30,40,35,.8)" strokeWidth="2.5" paintOrder="stroke">
              {player.name}
            </text>}
          </g>
        );
      })}
    </svg>
  );
}

export function MapPanel({ snapshot, onClose }: MapPanelProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="折叠小地图"
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
      <MapSurface snapshot={snapshot} />
    </button>
  );
}
