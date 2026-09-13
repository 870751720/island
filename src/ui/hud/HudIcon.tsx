import type { ReactNode } from 'react';

export type HudIconName = 'backpack' | 'settings' | 'health' | 'hunger' | 'thirst';

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
    health: <path d="M16 27 5 16C-3 7 9-1 16 8 23-1 35 7 27 16Z" fill="currentColor" stroke="none" />,
    hunger: <>
      <path d="M13 20c-5-3-4-9 1-13s12-3 14 2-1 11-6 13c-3 1-6 0-9-2Z" fill="currentColor" stroke="none" />
      <path d="m13 20-5 5m0 0c-4-2-6 3-3 4 1 3 6 1 3-4Z" />
    </>,
    thirst: <><path d="M16 3S6 14 6 20a10 10 0 0 0 20 0C26 14 16 3 16 3Z" fill="currentColor" stroke="none" /><path d="M11 20c0 3 2 5 5 5" stroke="#fff" opacity=".65" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[name]}</svg>;
}
