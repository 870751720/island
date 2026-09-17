'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './SlotItemName.module.css';

/** 固定格子内的单行名称，仅溢出时按实际距离缓慢往返。 */
export function SlotItemName({ name }: { name: string }) {
  const viewport = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useLayoutEffect(() => {
    const measure = () => setOverflow(Math.max(0, (text.current?.scrollWidth ?? 0) - (viewport.current?.clientWidth ?? 0)));
    measure();
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    if (text.current) observer.observe(text.current);
    return () => observer.disconnect();
  }, [name]);

  const motion = {
    '--name-travel': `${-overflow}px`,
    '--name-duration': `${Math.max(6, overflow / 12 * 2 + 3)}s`,
  } as CSSProperties;

  return (
    <span ref={viewport} className={styles.viewport} style={motion}>
      <span key={name} ref={text} className={overflow > 0 ? styles.scrolling : styles.text}>{name}</span>
    </span>
  );
}
