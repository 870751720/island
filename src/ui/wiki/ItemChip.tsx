import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { ItemIcon } from '../ItemIcon';
import { useScrollAreaTap } from './wikiTaps';
import styles from './WikiPanel.module.css';

/** 图鉴中可跳转的材料、食物与产物。 */
export function ItemChip({ kind, count, onOpen }: { kind: ResourceKind; count?: number; onOpen: (kind: ResourceKind) => void }) {
  const tap = useScrollAreaTap(() => onOpen(kind));
  return (
    <button className={styles.chip} {...tap} aria-label={`查看${ITEMS[kind].name}`}>
      <ItemIcon kind={kind} size={18} />
      <span className={styles.chipName}>{ITEMS[kind].name}</span>
      {count !== undefined && count > 1 && <span className={styles.chipCount}>×{count}</span>}
    </button>
  );
}
