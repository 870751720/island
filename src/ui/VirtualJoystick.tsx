'use client';

import { useRef, useState } from 'react';

const SIZE = 120;
const KNOB = 52;
const MAX_OFFSET = (SIZE - KNOB) / 2;

/** 左下角虚拟摇杆,Pointer Events 触控拖动,输出归一化移动向量 */
export function VirtualJoystick({
  onChange,
}: {
  onChange: (x: number, z: number) => void;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const update = (clientX: number, clientY: number) => {
    const rect = baseRef.current!.getBoundingClientRect();
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
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
    setOffset({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={(e) => {
        pointerIdRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointerIdRef.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      style={{
        position: 'absolute',
        left: 16,
        bottom: 24,
        width: SIZE,
        height: SIZE,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.18)',
        border: '2px solid rgba(255,255,255,0.45)',
        touchAction: 'none',
        userSelect: 'none',
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
  );
}
