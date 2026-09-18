'use client';

import { useState } from 'react';
import type { HudSnapshot } from '@/game/GameContracts';
import { HIDDEN_RECIPES } from '@/game/systems/HiddenRecipes';
import { ITEMS } from '@/game/systems/Items';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ItemIcon } from './ItemIcon';
import { itemCount } from './inventorySnapshot';
import { OverflowMarquee } from './OverflowMarquee';
import { RecipeListFilters } from './RecipeListFilters';
import styles from './ResearchTablePanel.module.css';

export function DiscoveredRecipes({ hud }: { hud: HudSnapshot }) {
  const [query, setQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const count = (kind: ResourceKind) => itemCount(hud.slots, kind);
  const known = HIDDEN_RECIPES.filter(r => hud.discoveredRecipes.includes(r.kind));
  const visible = known.filter(r => r.name.includes(query.trim())
    && (!availableOnly || Object.entries(r.cost).every(([k, n]) => count(k as ResourceKind) >= n!)))
    .sort((a, b) => Number(b.kind === hud.research.result) - Number(a.kind === hud.research.result));
  return <div className={styles.knownBody}>
    {known.length > 0 && <RecipeListFilters query={query} onQuery={setQuery} availableOnly={availableOnly} onAvailableOnly={setAvailableOnly} />}
    <div className={styles.cards}>
      {known.length === 0 && <p>还没有发现新料理，跟着线索尝试一组食材吧。</p>}
      {known.length > 0 && visible.length === 0 && <p>没有符合条件的料理，试试其他名称或切换「全部」。</p>}
      {visible.map(r => <article className={styles.recipeRow} key={r.kind}>
        <ItemIcon kind={r.kind} size={32} />
        <span className={styles.recipeName}>{r.name}</span>
        <div className={styles.recipeCost}><OverflowMarquee label={Object.entries(r.cost)
          .map(([kind, amount]) => `${ITEMS[kind as ResourceKind].name} ×${amount}`).join(' + ')} /></div>
      </article>)}
    </div>
  </div>;
}
