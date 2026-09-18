'use client';
import { useMemo, useState } from 'react';
import { ITEM_WIKI_ENTRIES, ITEM_WIKI_GROUPS } from './itemWiki';
import { ITEMS, ITEM_CATEGORIES, type ItemCategory } from '@/game/systems/Items';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ItemIcon } from '../ItemIcon';
import styles from './WikiPanel.module.css';

/** 当前在翻阅的列表与位置:kinds 是玩家此刻看到的有序物品(某个分类或搜索结果) */
type DetailPosition = { kinds: readonly ResourceKind[]; index: number };

function ItemTile({ kind, onClick }: { kind: ResourceKind; onClick: () => void }) {
  const item = ITEMS[kind];
  return (
    <button className={styles.tile} onClick={onClick} aria-label={`查看${item.name}`}>
      <ItemIcon kind={kind} size={30} />
      <span className={styles.tileName}>{item.name}</span>
    </button>
  );
}

/** 物品分类:按游戏内分类浏览物品网格,点开进入单品详情,可上一件/下一件连续翻阅 */
export function ItemsWiki() {
  const [category, setCategory] = useState<ItemCategory>('材料');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<DetailPosition | null>(null);

  const keyword = query.trim();
  const searchGroups = useMemo(() => {
    if (!keyword) return null;
    return ITEM_WIKI_GROUPS.map((group) => ({
      category: group.category,
      kinds: group.entries
        .filter((entry) => ITEMS[entry.kind].name.includes(keyword))
        .map((entry) => entry.kind),
    })).filter((group) => group.kinds.length > 0);
  }, [keyword]);

  const openDetail = (kinds: readonly ResourceKind[], index: number) => setDetail({ kinds, index });
  const stepDetail = (delta: number) =>
    setDetail((current) =>
      current
        ? { ...current, index: (current.index + delta + current.kinds.length) % current.kinds.length }
        : current
    );

  if (detail) {
    const kind = detail.kinds[detail.index]!;
    const entry = ITEM_WIKI_ENTRIES.get(kind)!;
    const item = ITEMS[kind];
    const multi = detail.kinds.length > 1;
    return (
      <div className={styles.root}>
        <button className={styles.back} onClick={() => setDetail(null)}>‹ 返回列表</button>
        <div className={`hud-panel-enter ${styles.scroll}`} key={kind}>
          <div className={styles.detailHead}>
            <span className={styles.detailIcon}><ItemIcon kind={kind} size={34} /></span>
            <span className={styles.detailTitle}>
              <strong>{item.name}</strong>
              <span className={styles.detailTag}>{entry.category}</span>
            </span>
          </div>
          <p className={styles.desc}>{item.description}</p>
          {entry.stats.length > 0 && (
            <div className={styles.stats}>
              {entry.stats.map((stat) => (
                <div className={styles.statRow} key={stat.label}>
                  <span className={styles.statLabel}>{stat.label}</span>
                  <span className={styles.statValue}>{stat.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.pager}>
          <button onClick={() => stepDetail(-1)} disabled={!multi} aria-label="上一件物品">‹ 上一件</button>
          <span className={styles.pagerPos}>{multi ? `${detail.index + 1}/${detail.kinds.length}` : ''}</span>
          <button onClick={() => stepDetail(1)} disabled={!multi} aria-label="下一件物品">下一件 ›</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <input
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索物品…"
          aria-label="搜索物品"
        />
        {!searchGroups && (
          <nav className={styles.subtabs} aria-label="物品分类">
            {ITEM_CATEGORIES.map((c) => (
              <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </nav>
        )}
      </div>
      <div className={styles.scroll}>
        {searchGroups ? (
          searchGroups.length === 0 ? (
            <p className={styles.empty}>没有找到「{keyword}」相关的物品</p>
          ) : (
            searchGroups.map((group) => (
              <section key={group.category}>
                <h4 className={styles.groupTitle}>{group.category} · {group.kinds.length}</h4>
                <div className={styles.grid}>
                  {group.kinds.map((kind, index) => (
                    <ItemTile key={kind} kind={kind} onClick={() => openDetail(group.kinds, index)} />
                  ))}
                </div>
              </section>
            ))
          )
        ) : (
          (() => {
            const group = ITEM_WIKI_GROUPS.find((g) => g.category === category)!;
            const kinds = group.entries.map((entry) => entry.kind);
            return (
              <>
                <span className={styles.count}>共 {kinds.length} 件</span>
                <div className={styles.grid}>
                  {kinds.map((kind, index) => (
                    <ItemTile key={kind} kind={kind} onClick={() => openDetail(kinds, index)} />
                  ))}
                </div>
              </>
            );
          })()
        )}
      </div>
    </div>
  );
}
