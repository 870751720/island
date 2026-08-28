'use client';

import { useRef, useState } from 'react';

const SIZE = 120;
const KNOB = 52;
const MAX_OFFSET = (SIZE - KNOB) / 2;

/**
 * 浮动虚拟摇杆:全屏任意空白处按下即在触点生成摇杆,抬起后消失。
 * 触控层须在 DOM 中位于各按钮之前,按钮优先接收事件。
 * Pointer Events 触控拖动,输出归一化移动向量。
 */
export function VirtualJoystick({
  onChange,
}: {
  onChange: (x: number, z: number) => void;
}) {
  const pointerIdRef = useRef<number | null>(null);
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const update = (cx: number, cy: number, px: number, py: number) => {
    let dx = px - cx;
    let dy = py - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_OFFSET) {
      dx = (dx / dist) * MAX_OFFSET;
      dy = (dy / dist) * MAX_OFFSET;
    }
    setOffset({ x: dx, y: dy });
    onChange(dx / MAX_OFFSET, dy / MAX_OFFSET);
  };

  const reset = () => {
    pointerIdRef.current = null;
    setCenter(null);
    setOffset({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div
      onPointerDown={(e) => {
        if (pointerIdRef.current !== null) return;
        pointerIdRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        setCenter({ x: e.clientX, y: e.clientY });
        update(e.clientX, e.clientY, e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointerIdRef.current !== e.pointerId || !center) return;
        update(center.x, center.y, e.clientX, e.clientY);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      style={{
        position: 'absolute',
        inset: 0,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {center && (
        <div
          style={{
            position: 'fixed',
            left: center.x,
            top: center.y,
            width: SIZE,
            height: SIZE,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            border: '2px solid rgba(255,255,255,0.45)',
            transform: 'translate(-50%, -50%)',
            animation: 'joystick-fade-in 150ms ease-out',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: KNOB,
              height: KNOB,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.65)',
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            }}
          />
        </div>
      )}
      <style>{`@keyframes joystick-fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
}
