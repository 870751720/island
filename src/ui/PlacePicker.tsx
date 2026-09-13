'use client';

import { gameTheme, gamePanelStyle, gameButtonStyle } from './gameTheme';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { EmojiDef } from '../game/social/Emojis';
import { EmojiFaceIcon } from './icons/EmojiFaceIcon';

/** 手持项选择面板:长按工具按钮弹出,顶部为快捷表情区(点选在头顶冒气泡),
 * 下方平铺所有可切换的手持项(普通工具 + 可放置道具,图标+名称+数量角标),
 * 当前手持高亮;点选直接切入,点面板外任意处关闭。
 * 点选/关闭统一在 click 上结算:click 是一次点按的终结事件,结算后面板卸载
 * 不会再有后续 click 重定向命中面板下方露出的按钮(如背包);若在 pointerdown/up
 * 上结算,面板提前卸载后浏览器仍会派发 click 到当时露出的按钮,造成误触 */
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
  // 长按弹出面板的那次按住还在进行:抬起后浏览器仍会为它派发一次 click,
  // 此时面板刚出现,click 会命中遮罩被当作「点面板外」把面板立刻关掉。
  // 面板挂载后监听第一个抬起:若期间没有新的按下(即属于开面板那次按住),
  // 在捕获阶段吞掉紧随其后的那一次 click;新按下必须解除拦截,
  // 因为触屏取消/按钮禁用等情况可能使开面板的手势根本不产生 click。
  useEffect(() => {
    let pressedAfterMount = false;
    const swallow = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };
    const onDown = () => {
      pressedAfterMount = true;
      window.removeEventListener('click', swallow, true);
    };
    const onUp = () => {
      window.removeEventListener('pointerup', onUp, true);
      if (pressedAfterMount) return;
      window.addEventListener('click', swallow, { capture: true, once: true });
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointerup', onUp, { capture: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('click', swallow, true);
    };
  }, []);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: gameTheme.overlay,
      }}
    >
      <div
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
        {showEmojis && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 60px)', gap: 8 }}>
              {emojis!.map((emoji) => (
                <button
                  key={emoji.glyph}
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
                    touchAction: 'none',
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
