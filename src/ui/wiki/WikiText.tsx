import { Fragment } from 'react';
import type { ResourceKind } from '@/game/systems/Inventory';
import { useScrollAreaTap } from './wikiTaps';
import styles from './WikiPanel.module.css';

export type WikiTextValue = string | readonly (string | { kind: ResourceKind; label: string })[];

function ItemWord({ kind, label, onOpen }: { kind: ResourceKind; label: string; onOpen: (kind: ResourceKind) => void }) {
  const tap = useScrollAreaTap(() => onOpen(kind));
  return <button type="button" className={styles.itemWord} {...tap} aria-label={`查看${label}的物品详情`}>{label}</button>;
}

/** 文案中的物品引用显式登记，避免同名词语被误识别为链接。 */
export function WikiText({ value, onOpen }: { value: WikiTextValue; onOpen: (kind: ResourceKind) => void }) {
  if (typeof value === 'string') return value;
  return value.map((part, index) => typeof part === 'string'
    ? <Fragment key={index}>{part}</Fragment>
    : <ItemWord key={index} {...part} onOpen={onOpen} />);
}
