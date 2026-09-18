'use client';

import { gameButtonStyle } from './gameTheme';
import styles from './RecipeListFilters.module.css';

/** 已发现料理列表共用的触屏筛选，不在未发现内容中搜索。 */
export function RecipeListFilters({ query, onQuery, availableOnly, onAvailableOnly }: {
  query: string;
  onQuery: (value: string) => void;
  availableOnly: boolean;
  onAvailableOnly: (value: boolean) => void;
}) {
  return <div className={styles.filters}>
    <input type="search" aria-label="搜索已发现料理" placeholder="搜索已发现料理" value={query}
      onChange={event => onQuery(event.target.value)} className={styles.search} />
    <div className={styles.options} aria-label="材料筛选">
      <button style={gameButtonStyle} aria-pressed={!availableOnly} onClick={() => onAvailableOnly(false)}>全部</button>
      <button style={gameButtonStyle} aria-pressed={availableOnly} onClick={() => onAvailableOnly(true)}>材料充足</button>
    </div>
  </div>;
}
