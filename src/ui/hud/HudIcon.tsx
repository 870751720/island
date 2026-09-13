import type { ReactNode } from 'react';

export type HudIconName = 'backpack' | 'settings';

/** HUD 专用矢量图标，背包使用暖色块面与高光，齿轮使用圆角笔触，不依赖系统 emoji 字体。 */
export function HudIcon({ name, size = 24 }: { name: HudIconName; size?: number }) {
  const drawings: Record<HudIconName, ReactNode> = {
    backpack: <g stroke="none">
      <path d="M12 8V6c0-4 8-4 8 0v2h-2V6c0-2-4-2-4 0v2Z" fill="#775234" />
      <rect x="4" y="17" width="7" height="11" rx="2.5" fill="#987044" />
      <rect x="22" y="17" width="6" height="11" rx="2.5" fill="#805936" />
      <path d="M7 13q0-6 9-6t9 6v12q0 5-5 5h-8q-5 0-5-5Z" fill="#C69A60" />
      <path d="M21 9q4 1 4 5v11q0 5-5 5h-8q-4 0-5-4 5 2 10 1 4-1 4-5Z" fill="#A57743" />
      <path d="M7 12q0-5 9-5t9 5v3q-9 5-18 0Z" fill="#E3BE83" />
      <path d="M10 11q4-3 10-1" fill="none" stroke="#F5D8A4" strokeWidth="1.5" />
      <rect x="10" y="20" width="12" height="8" rx="2.5" fill="#DCAD6E" />
      <path d="M11 22h10" stroke="#F0CC95" strokeWidth="1" />
      <rect x="14.5" y="14" width="3" height="7" rx="1" fill="#88603A" />
      <rect x="14" y="16" width="4" height="3" rx=".7" fill="#F4D58B" />
      <path d="M15 17.5h2" stroke="#A67A44" strokeWidth=".7" />
    </g>,
    settings: <>
      <path d="m13 3 6 0 1 4 3 2 4-1 3 5-3 3v3l3 3-3 5-4-1-3 2-1 3h-6l-1-3-3-2-4 1-3-5 3-3v-3l-3-3 3-5 4 1 3-2Z" transform="translate(1 -1) scale(.94)" />
      <circle cx="16" cy="15" r="4.5" />
    </>,

  };
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[name]}</svg>;
}
