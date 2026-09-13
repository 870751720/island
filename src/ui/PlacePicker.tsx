'use client';

import { gameTheme, gamePanelStyle, gameButtonStyle } from './gameTheme';

import type { ReactNode } from 'react';
import type { EmojiDef } from '../game/social/Emojis';

/** 手持项选择面板:长按工具按钮弹出,顶部为快捷表情区(点选在头顶冒气泡),
 * 下方平铺所有可切换的手持项(普通工具 + 可放置道具,图标+名称+数量角标),
 * 当前手持高亮;点选直接切入,点面板外任意处关闭 */
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
  onPick,
  onClose,
  emojis,
  onPickEmoji,
}: {
  items: T[];
  onPick: (item: T) => void;
  onClose: () => void;
  /** 顶部快捷表情区;与 onPickEmoji 同时传入时渲染 */
  emojis?: readonly EmojiDef[];
  onPickEmoji?: (glyph: string) => void;
}) {
  const showEmojis = !!emojis?.length && !!onPickEmoji;
  return (
    <div
      onPointerUp={(e) => {
        e.preventDefault();
        onClose();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: gameTheme.overlay,
      }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
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
        {showEmojis && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 60px)', gap: 8 }}>
              {emojis!.map((emoji) => (
                <button
                  key={emoji.glyph}
                  aria-label={emoji.name}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    onPickEmoji!(emoji.glyph);
                  }}
                  style={{
                    width: 60,
                    height: 60,
                    ...gameButtonStyle,
                    borderRadius: 10,
                    background: gameTheme.surface,
                    fontSize: 32,
                    lineHeight: '60px',
                    touchAction: 'none',
                    userSelect: 'none',
                  }}
                >
                  {emoji.glyph}
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
              onPointerUp={(e) => {
                e.preventDefault();
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
                touchAction: 'none',
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
