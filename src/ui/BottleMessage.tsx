'use client';

/** 瓶中信弹窗:拔开漂流瓶后展示一句留言,点击任意处关闭并消失 */
export function BottleMessage({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div
      onPointerDown={(e) => {
        e.preventDefault();
        onClose();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
      }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: 'min(340px, 86vw)',
          padding: '22px 20px 18px',
          background: '#f4ecd4',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          fontFamily: 'sans-serif',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ textAlign: 'center', fontSize: 34 }}>🍾</div>
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.8,
            color: '#5a4a30',
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
            border: 'none',
            borderRadius: 10,
            background: '#8a6f4b',
            color: '#fff',
            fontFamily: 'sans-serif',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          收好纸条
        </button>
      </div>
    </div>
  );
}
