'use client';

import { gameTheme, gamePanelStyle, gameButtonStyle } from './gameTheme';

import { usePickerDrag, type PickerPress } from './usePickerDrag';
import './PlacePicker.css';
import type { ReactNode } from 'react';
import type { EmojiDef } from '../game/social/Emojis';
import { EmojiFaceIcon } from './icons/EmojiFaceIcon';

/** 手持项选择面板:长按工具按钮弹出,顶部为快捷表情区(点选在头顶冒气泡),
 * 下方平铺所有可切换的手持项(普通工具 + 可放置道具,图标+名称+数量角标),
 * 当前手持高亮；长按滑动松手选择，也可松手后点选。 */
export interface PickerItem {
  key: string;
  icon: ReactNode;
  name: string;
  /** 可放置道具的剩余个数(普通工具无) */
  count?: number;
  /** 是否为当前手持(高亮边框) */
  active?: boolean;
}

export function PlacePicker<T extends PickerItem>({
  items,
  press = null,
  onPick,
  onClose,
  emojis,
  onPickEmoji,
}: {
  items: T[];
  press?: PickerPress | null;
  onPick: (item: T) => void;
  onClose: () => void;
  /** 顶部快捷表情区;与 onPickEmoji 同时传入时渲染 */
  emojis?: readonly EmojiDef[];
  onPickEmoji?: (glyph: string) => void;
}) {
  const showEmojis = !!emojis?.length && !!onPickEmoji;
  const { panelRef, hovered, dragging } = usePickerDrag(press, (key) => {
    if (key.startsWith('emoji:')) onPickEmoji?.(key.slice(6));
    else {
      const item = items.find((entry) => `item:${entry.key}` === key);
      if (item) onPick(item);
    }
  });
  const hoverName = hovered?.startsWith('emoji:')
    ? emojis?.find((emoji) => `emoji:${emoji.glyph}` === hovered)?.name
    : items.find((item) => `item:${item.key}` === hovered)?.name;
  return (
    <div
      className="place-picker-overlay"
      onContextMenu={(event) => event.preventDefault()}
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: gameTheme.overlay,
      }}
    >
      <div
        ref={panelRef}
        className="place-picker-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          right: 'max(16px, env(safe-area-inset-right))',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 10,
          borderRadius: 14,
          ...gamePanelStyle,
          boxShadow: gameTheme.shadow,
          maxHeight: '60vh',
          overflowY: 'auto',
        }}
      >
        <div className="place-picker-hint" aria-live="polite">
          {hoverName ? `松手选择 · ${hoverName}` : dragging ? '滑到物品上，松手选择' : '点击选择物品'}
        </div>
        {showEmojis && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 60px)', gap: 8 }}>
              {emojis!.map((emoji) => (
                <button
                  key={emoji.glyph}
                  className="place-picker-item"
                  data-picker-key={`emoji:${emoji.glyph}`}
                  data-hovered={hovered === `emoji:${emoji.glyph}`}
                  aria-label={emoji.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPickEmoji!(emoji.glyph);
                  }}
                  style={{
                    width: 60,
                    height: 60,
                    ...gameButtonStyle,
                    borderRadius: 10,
                    background: gameTheme.surface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    touchAction: 'pan-y',
                    userSelect: 'none',
                  }}
                >
                  <EmojiFaceIcon glyph={emoji.glyph} size={36} />
                </button>
              ))}
            </div>
            <div style={{ height: 1, background: gameTheme.inset }} />
          </>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 60px)', gap: 8 }}>
          {items.map((item) => (
            <button
              key={item.key}
              className="place-picker-item"
              data-picker-key={`item:${item.key}`}
              data-hovered={hovered === `item:${item.key}`}
              aria-label={item.name}
              aria-pressed={!!item.active}
              onClick={(e) => {
                e.stopPropagation();
                onPick(item);
              }}
              style={{
                position: 'relative',
                width: 60,
                height: 60,
                border: item.active ? gameTheme.selectionBorder : gameTheme.line,
                borderRadius: 10,
                background: item.active
                  ? gameTheme.selected
                  : gameTheme.surface,
                fontSize: 26,
                lineHeight: '34px',
                touchAction: 'pan-y',
                userSelect: 'none',
              }}
            >
              {item.icon}
              <span
                style={{
                  display: 'block',
                  fontSize: 10,
                  lineHeight: '14px',
                  color: gameTheme.ink,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {item.name}
              </span>
              {item.count !== undefined && (
                <span
                  style={{
                    position: 'absolute',
                    right: 2,
                    top: 2,
                    minWidth: 18,
                    padding: '0 4px',
                    borderRadius: 9,
                    background: gameTheme.selected,
                    color: gameTheme.ink,
                    fontSize: 11,
                    lineHeight: '16px',
                  }}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
