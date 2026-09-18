'use client';
import { useLayoutEffect, useMemo, useState } from 'react';
import { ITEM_WIKI_ENTRIES, ITEM_WIKI_GROUPS, wikiItemName, wikiItemSearchText } from './itemWiki';
import { ITEMS, itemCategory, ITEM_CATEGORIES, type ItemCategory } from '@/game/systems/Items';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ItemIcon } from '../ItemIcon';
import { ItemChip } from './ItemChip';
import { pressAction } from '../pressAction';
import { swallowTrailingClick, useScrollAreaTap } from './wikiTaps';
import styles from './WikiPanel.module.css';

/** 正在翻阅的浏览轨迹:每次进入一件物品压栈,返回时逐层退回(列表 → 物品 → 配方材料 → …) */
type DetailPosition = { kinds: readonly ResourceKind[]; index: number };

function ItemTile({ kind, onClick }: { kind: ResourceKind; onClick: () => void }) {
  const tap = useScrollAreaTap(onClick);
  return (
    <button className={styles.tile} {...tap} aria-label={`查看${wikiItemName(kind)}`}>
      <ItemIcon kind={kind} size={30} />
      <span className={styles.tileName}>{wikiItemName(kind)}</span>
    </button>
  );
}

/** 物品分类:按游戏内分类浏览物品网格,点开进入单品详情,可上一件/下一件连续翻阅 */
export function ItemsWiki({ onDetailChange, initialKind, onExit, exitLabel = '返回生物详情' }: {
  onDetailChange: (inDetail: boolean) => void;
  initialKind?: ResourceKind;
  onExit?: () => void;
  exitLabel?: string;
}) {
  const [category, setCategory] = useState<ItemCategory>('材料');
  const [query, setQuery] = useState('');
  const [trail, setTrail] = useState<DetailPosition[]>(() => {
    if (!initialKind) return [];
    const kinds = ITEM_WIKI_GROUPS.find((group) => group.category === itemCategory(initialKind))!.entries.map((entry) => entry.kind);
    return [{ kinds, index: kinds.indexOf(initialKind) }];
  });

  const keyword = query.trim();
  const searchGroups = useMemo(() => {
    if (!keyword) return null;
    return ITEM_WIKI_GROUPS.map((group) => ({
      category: group.category,
      kinds: group.entries
        .filter((entry) => wikiItemSearchText(entry.kind).includes(keyword))
        .map((entry) => entry.kind),
    })).filter((group) => group.kinds.length > 0);
  }, [keyword]);

  const openDetail = (kinds: readonly ResourceKind[], index: number) => setTrail((t) => [...t, { kinds, index }]);
  // 从配方材料跳转:在目标所属分类的完整列表中打开,便于沿该分类连续翻阅
  const openKind = (kind: ResourceKind) => {
    const group = ITEM_WIKI_GROUPS.find((g) => g.category === itemCategory(kind));
    const index = group ? group.entries.findIndex((entry) => entry.kind === kind) : -1;
    if (index >= 0) openDetail(group!.entries.map((entry) => entry.kind), index);
  };
  const stepDetail = (delta: number) =>
    setTrail((t) => {
      if (t.length === 0) return t;
      const top = t[t.length - 1]!;
      const stepped = { ...top, index: (top.index + delta + top.kinds.length) % top.kinds.length };
      return [...t.slice(0, -1), stepped];
    });
  // 返回会把手指下方换回上一个视图的控件,吞掉尾随 click 避免误触。
  const backFromDetail = () => {
    swallowTrailingClick();
    if (trail.length === 1 && onExit) { onExit(); return; }
    setTrail((t) => t.slice(0, -1));
  };

  const detail = trail[trail.length - 1] ?? null;
  // 进入/退出详情时上报外层收起/恢复顶层分类导航;layout 阶段同步,导航不残留一帧
  useLayoutEffect(() => { onDetailChange(detail !== null); }, [detail, onDetailChange]);
  if (detail) {
    const kind = detail.kinds[detail.index]!;
    const entry = ITEM_WIKI_ENTRIES.get(kind)!;
    const item = ITEMS[kind];
    const multi = detail.kinds.length > 1;
    return (
      <div className={styles.root}>
        <button className={styles.back} {...pressAction(backFromDetail)}>
          {trail.length > 1 ? '‹ 返回上一件' : onExit ? `‹ ${exitLabel}` : '‹ 返回列表'}
        </button>
        <div className={`hud-panel-enter ${styles.scroll}`} key={kind}>
          <div className={styles.detailHead}>
            <span className={styles.detailIcon}><ItemIcon kind={kind} size={34} /></span>
            <span className={styles.detailTitle}>
              <strong>{wikiItemName(kind)}</strong>
              <span className={styles.tagRow}>
                <span className={styles.detailTag}>{entry.category}</span>
                {entry.sourceGroups.map((group) => (
                  <span className={styles.detailTag} key={group}>{group}</span>
                ))}
              </span>
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
          {entry.sources.length > 0 && (
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>获得方式</h4>
              {entry.sources.map((source) => (
                <div className={styles.sourceCard} key={`${source.group}:${source.station ?? ''}:${source.label}:${source.note ?? ''}`}>
                  {source.station && <ItemChip kind={source.station} onOpen={openKind} />}
                  {source.inputs?.map((input) => (
                    <ItemChip key={input.kind} kind={input.kind} count={input.count} onOpen={openKind} />
                  ))}
                  {source.target ? (
                    <ItemChip kind={source.target} onOpen={openKind} />
                  ) : (
                    <span className={styles.sourceLabel}>{source.label}</span>
                  )}
                  {source.note && <span className={styles.sourceNote}>{source.note}</span>}
                </div>
              ))}
            </section>
          )}
          {entry.recycle && (
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>回收方式</h4>
              <div className={styles.sourceCard}>
                <ItemChip kind="shovel" name={wikiItemName('shovel')} onOpen={openKind} />
                <span className={styles.sourceLabel}>{entry.recycle.label}</span>
                {entry.recycle.target && <ItemChip kind={entry.recycle.target} onOpen={openKind} />}
                {entry.recycle.note && <span className={styles.sourceNote}>{entry.recycle.note}</span>}
              </div>
            </section>
          )}
        </div>
        <div className={styles.pager}>
          <button {...pressAction(() => stepDetail(-1))} disabled={!multi} aria-label="上一件物品">‹ 上一件</button>
          <span className={styles.pagerPos}>{multi ? `${detail.index + 1}/${detail.kinds.length}` : ''}</span>
          <button {...pressAction(() => stepDetail(1))} disabled={!multi} aria-label="下一件物品">下一件 ›</button>
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
              <button key={c} aria-pressed={category === c} {...pressAction(() => setCategory(c))}>{c}</button>
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
              <div className={styles.grid}>
                {kinds.map((kind, index) => (
                  <ItemTile key={kind} kind={kind} onClick={() => openDetail(kinds, index)} />
                ))}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
