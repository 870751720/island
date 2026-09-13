'use client';

import { EMOJI_ICONS } from '@/game/social/EmojiIcons';

/** 自绘表情图标:与头顶气泡共用同一份 SVG 标记(见 EmojiIcons);
 * 无自绘图的字形回退为系统 emoji 文字 */
export function EmojiFaceIcon({ glyph, size }: { glyph: string; size: number }) {
  const markup = EMOJI_ICONS[glyph];
  if (markup === undefined) {
    return <span style={{ fontSize: Math.round(size * 0.72), lineHeight: 1 }}>{glyph}</span>;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
