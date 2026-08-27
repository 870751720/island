'use client';

/** 右下角动作按钮,靠近资源点时出现并显示动作名 */
export function ActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      style={{
        position: 'absolute',
        right: 20,
        bottom: 36,
        width: 84,
        height: 84,
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(76, 175, 80, 0.85)',
        color: '#fff',
        fontFamily: 'sans-serif',
        fontSize: 17,
        fontWeight: 700,
        touchAction: 'none',
        userSelect: 'none',
        boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
      }}
    >
      {label}
    </button>
  );
}
