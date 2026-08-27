'use client';

/** 右下角动作按钮,靠近资源点时出现;工具不满足时置灰提示 */
export function ActionButton({
  label,
  enabled,
  onPress,
}: {
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <button
      disabled={!enabled}
      onPointerDown={(e) => {
        e.preventDefault();
        if (enabled) onPress();
      }}
      style={{
        position: 'absolute',
        right: 20,
        bottom: 36,
        width: 84,
        height: 84,
        borderRadius: '50%',
        border: 'none',
        background: enabled ? 'rgba(76, 175, 80, 0.85)' : 'rgba(120, 120, 120, 0.75)',
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
