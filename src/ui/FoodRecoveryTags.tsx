import type { Food } from '@/game/systems/Food';
import { gameTheme } from './gameTheme';
import { VITAL_STYLES } from './vitalStyles';

/** 展示单份食物的基础恢复量；每个标签作为整体参与标题换行。 */
export function FoodRecoveryTags({ food }: { food: Food }) {
  return VITAL_STYLES.filter(({ key }) => food[key] > 0).map(({ key, label, color }) => (
    <span key={key} style={{
      background: color,
      color: gameTheme.ink,
      borderRadius: 5,
      padding: '2px 5px',
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
    }}>
      {label}+{food[key]}
    </span>
  ));
}
