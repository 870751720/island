'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './OverflowMarquee.module.css';

/** 单行内容仅在溢出时慢速往返，两端停留；不参与父级宽度计算。 */
export function OverflowMarquee({ label, children }: { label: string; children?: ReactNode }) {
  const viewport = useRef<HTMLSpanElement>(null);
  const content = useRef<HTMLSpanElement>(null);
  const [travel, setTravel] = useState(0);

  useLayoutEffect(() => {
    const measure = () => setTravel(Math.max(0, (content.current?.scrollWidth ?? 0) - (viewport.current?.clientWidth ?? 0)));
    measure();
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, [label]);

  return (
    <span ref={viewport} className={styles.viewport} data-overflow={travel > 0} title={label} aria-label={label}
      style={{ '--travel': `${-travel}px`, '--duration': `${Math.max(8, travel / 20 * 2 + 4)}s` } as CSSProperties}>
      <span key={label} ref={content} className={styles.content} aria-hidden="true">{children ?? label}</span>
    </span>
  );
}
