import type { ReactNode } from 'react';

export type HudIconName = 'backpack' | 'settings';

/** HUD 专用矢量图标，统一圆角笔触，不依赖系统 emoji 字体。 */
export function HudIcon({ name, size = 24 }: { name: HudIconName; size?: number }) {
  const drawings: Record<HudIconName, ReactNode> = {
    backpack: <>
      <path d="M12 8V6a4 4 0 0 1 8 0v2" fill="none" />
      <path d="M8 13H5v12a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3V13h-3" fill="#698c86" />
      <rect x="8" y="7" width="16" height="22" rx="5" fill="#d4b985" />
      <path d="M8 12c0-4 16-4 16 0v4c-4 3-12 3-16 0Z" fill="#f3dfb6" />
      <rect x="11" y="21" width="10" height="6" rx="2" fill="#a78253" />
      <path d="M13 23h6M16 15v4" fill="none" />
    </>,
    settings: <>
      <path d="m13 3 6 0 1 4 3 2 4-1 3 5-3 3v3l3 3-3 5-4-1-3 2-1 3h-6l-1-3-3-2-4 1-3-5 3-3v-3l-3-3 3-5 4 1 3-2Z" transform="translate(1 -1) scale(.94)" />
      <circle cx="16" cy="15" r="4.5" />
    </>,

  };
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[name]}</svg>;
}
