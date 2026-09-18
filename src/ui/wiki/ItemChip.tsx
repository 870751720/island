import { wikiItemHidden } from './itemWiki';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { ItemIcon } from '../ItemIcon';
import { useScrollAreaTap } from './wikiTaps';
import styles from './WikiPanel.module.css';

/** 图鉴中可跳转的材料、食物与产物;name 覆盖显示名(如工具条目用统一名)。 */
export function ItemChip({ kind, count, note, name, onOpen }: { kind: ResourceKind; count?: number; note?: string; name?: string; onOpen: (kind: ResourceKind) => void }) {
  const tap = useScrollAreaTap(() => onOpen(kind));
  const hidden = wikiItemHidden(kind);
  const label = hidden ? '待发现' : name ?? ITEMS[kind].name;
  return (
    <button className={`${styles.chip}${note ? ` ${styles.chipWithNote}` : ''}`} {...tap} aria-label={`查看${label}${note ? `，${note}` : ''}`}>
      {hidden ? <span>?</span> : <ItemIcon kind={kind} size={18} />}
      <span className={styles.chipName}>{label}</span>
      {count !== undefined && count > 1 && <span className={styles.chipCount}>×{count}</span>}
      {note && <span className={styles.chipNote}>{note}</span>}
    </button>
  );
}
