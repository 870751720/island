'use client';

import { gameTheme, gamePanelStyle, gameButtonStyle } from './gameTheme';

import { ItemIcon } from './ItemIcon';
import type { ResourceKind } from '@/game/systems/Inventory';

/** 信纸弹窗:拆开漂流瓶/海神的信后展示一句留言,点击任意处关闭并消失 */
export function BottleMessage({
  text,
  onClose,
  kind = 'bottle',
  title = null,
  closeLabel = '收好纸条',
}: {
  text: string;
  onClose: () => void;
  /** 顶部展示的道具(漂流瓶 bottle / 海神的信 letter),图标走道具配置 */
  kind?: ResourceKind;
  /** 可选的小标题(如「海神的信」) */
  title?: string | null;
  closeLabel?: string;
}) {
  return (
    <div
      onPointerDown={(e) => {
        e.preventDefault();
        onClose();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        background: gameTheme.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
      }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: 'min(340px, calc(100vw - 72px))',
          padding: '22px 20px 18px',
          ...gamePanelStyle,
          borderRadius: 22,
          boxShadow: gameTheme.shadow,
          fontFamily: gameTheme.font,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ textAlign: 'center', fontSize: 34, display: 'flex', justifyContent: 'center' }}>
          <ItemIcon kind={kind} size={34} />
        </div>
        {title && (
          <div
            style={{
              textAlign: 'center',
              fontSize: 13,
              letterSpacing: '0.25em',
              color: gameTheme.accent,
              fontFamily: gameTheme.font,
              marginTop: -8,
            }}
          >
            {title}
          </div>
        )}
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.8,
            color: gameTheme.ink,
            textAlign: 'center',
            fontFamily: 'serif',
          }}
        >
          {text}
        </div>
        <button
          onClick={onClose}
          style={{
            minHeight: 44,
            ...gameButtonStyle,
            borderRadius: 10,
            background: gameTheme.action,
            color: gameTheme.ink,
            fontFamily: gameTheme.font,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
