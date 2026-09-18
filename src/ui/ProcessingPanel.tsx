'use client';

import { gameTheme } from './gameTheme';

import { ItemIcon } from './ItemIcon';
import { useEffect, useState } from 'react';
import { ITEMS } from '@/game/systems/Items';
import type { ResourceKind } from '@/game/systems/Inventory';
import type { ProcessingInfo } from '@/game/systems/ProcessingSystem';
import { ConvertRow, convertOverlayStyle, convertPanelStyle, convertRowStyle, convertActionButtonStyle, convertCollectButtonStyle, convertTakeButtonStyle, convertBarStyle } from './ConvertRow';

type Props = {
  kind: ResourceKind;
  input: ResourceKind;
  output: ResourceKind;
  inputCount: number;
  outputCount: number;
  interval: number;
  info: ProcessingInfo | null;
  inBag: number;
  onFeed: (count: number) => void;
  onCollect: () => void;
  onTakeInput: () => void;
  onClose: () => void;
};

const ACTION_COLOR = '#b5a642';

/** 加工设施共用的触屏投入、进度、收取和取回面板。 */
export function ProcessingPanel({ kind, input, output, inputCount, outputCount, interval, info, inBag, onFeed, onCollect, onTakeInput, onClose }: Props) {
  const [feedCount, setFeedCount] = useState(1);
  // 背包数量变化后把选数收回上限
  useEffect(() => {
    setFeedCount((prev) => Math.min(prev, inBag));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inBag]);

  // 走开后面板由外层收起,这里兜底不渲染
  if (!info) return null;
  const n = Math.max(1, Math.min(feedCount, inBag));
  const processing = info.input >= inputCount;

  return (
    <div
      style={convertOverlayStyle}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={convertPanelStyle}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}><ItemIcon kind={kind} size={20} /> {ITEMS[kind].name}</div>
        <div style={{ fontSize: 13, color: gameTheme.muted, marginBottom: 12 }}>
          每 {interval} 秒：{ITEMS[input].name} ×{inputCount} → {ITEMS[output].name} ×{outputCount}
        </div>

        <div style={{ ...convertRowStyle, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 0 100%', minWidth: 0 }}>
            <div style={{ fontSize: 14 }}>
              <ItemIcon kind={input} size={18} /> 机内{ITEMS[input].name} ×{info.input}
              <span style={{ fontSize: 11, color: processing ? ACTION_COLOR : gameTheme.muted, marginLeft: 6 }}>
                {processing ? '加工中' : info.input > 0 ? `还差 ${inputCount - info.input} 份开机` : ''}
              </span>
            </div>
            <div style={convertBarStyle}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(info.progress * 100)}%`,
                  background: `linear-gradient(90deg,${ACTION_COLOR},#e8e2d4)`,
                  transition: 'width 0.2s linear',
                }}
              />
            </div>
          </div>
          <ItemIcon kind={output} size={18} />
          <span style={{ fontSize: 14 }}>×{info.output}</span>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onTakeInput();
            }}
            disabled={info.input <= 0}
            style={{ ...convertTakeButtonStyle, minHeight: 44, minWidth: 44, marginLeft: 'auto', opacity: info.input > 0 ? 1 : 0.45 }}
          >
            取回
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onCollect();
            }}
            disabled={info.output <= 0}
            style={{ ...convertCollectButtonStyle, minHeight: 44, minWidth: 44, opacity: info.output > 0 ? 1 : 0.45 }}
          >
            收取
          </button>
        </div>

        {inBag > 0 ? (
          <ConvertRow
            stacked
            kind={input}
            to={output}
            max={inBag}
            value={n}
            onDelta={(d) => setFeedCount((prev) => Math.max(1, Math.min(prev + d, inBag)))}
            actionLabel="投入"
            actionColor={ACTION_COLOR}
            onAction={() => onFeed(n)}
          />
        ) : (
          <div style={{ fontSize: 13, color: gameTheme.muted }}>
            背包里没有{ITEMS[input].name}，备好原料再来吧
          </div>
        )}

        <button
          onPointerDown={(e) => {
            e.preventDefault();
            onClose();
          }}
          style={{ ...convertActionButtonStyle, minHeight: 44, marginTop: 16, width: '100%' }}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
