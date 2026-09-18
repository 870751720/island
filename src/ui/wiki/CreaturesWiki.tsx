'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ResourceKind } from '@/game/systems/Inventory';
import { CREATURE_ENTRIES, type CreatureEntry } from './creatureWiki';
import { CreatureIcon } from './CreatureIcon';
import { ItemChip } from './ItemChip';
import { ItemsWiki } from './ItemsWiki';
import { pressAction } from '../pressAction';
import { swallowTrailingClick, useScrollAreaTap } from './wikiTaps';
import styles from './WikiPanel.module.css';

function CreatureTile({ entry, onOpen }: { entry: CreatureEntry; onOpen: () => void }) {
  const tap = useScrollAreaTap(onOpen);
  return <button className={styles.tile} {...tap} aria-label={`查看${entry.name}`}>
    <CreatureIcon id={entry.id} />
    <span className={styles.tileName}>{entry.name}</span>
    <span className={styles.creatureTags}>{entry.tags.map((tag) => <span key={tag}>{tag}</span>)}</span>
  </button>;
}

function TextSection({ title, text }: { title: string; text: string }) {
  return <section className={styles.section}>
    <h4 className={styles.sectionTitle}>{title}</h4>
    <p className={styles.desc}>{text}</p>
  </section>;
}

function RelatedItems({ title, items, note, onOpen }: {
  title: string; items: CreatureEntry['foods']; note?: string; onOpen: (kind: ResourceKind) => void;
}) {
  if (!items.length) return null;
  return <section className={styles.section}>
    <h4 className={styles.sectionTitle}>{title}</h4>
    {note && <p className={styles.desc}>{note}</p>}
    <div className={styles.chips}>
      {items.map((item) => <div className={styles.relatedItem} key={item.kind}>
        <ItemChip kind={item.kind} count={item.count} onOpen={onOpen} />
        {item.note && <span className={styles.relatedNote}>{item.note}</span>}
      </div>)}
    </div>
  </section>;
}

/** 生物只有一层列表；标签说明特性，名称与标签都可搜索。 */
export function CreaturesWiki({ onDetailChange }: { onDetailChange: (inDetail: boolean) => void }) {
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<{ entries: readonly CreatureEntry[]; index: number } | null>(null);
  const [itemKind, setItemKind] = useState<ResourceKind | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const listTop = useRef(0);
  const detailTop = useRef(0);
  const inDetail = detail !== null;
  useLayoutEffect(() => { onDetailChange(inDetail); }, [inDetail, onDetailChange]);
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = detail ? detailTop.current : listTop.current;
  }, [detail, itemKind]);

  if (itemKind) return <ItemsWiki key={itemKind} initialKind={itemKind} onDetailChange={onDetailChange} onExit={() => setItemKind(null)} />;

  if (detail) {
    const entry = detail.entries[detail.index]!;
    const multi = detail.entries.length > 1;
    const step = (delta: number) => {
      detailTop.current = 0;
      setDetail({ ...detail, index: (detail.index + delta + detail.entries.length) % detail.entries.length });
    };
    const openItem = (kind: ResourceKind) => {
      detailTop.current = scroll.current?.scrollTop ?? 0;
      swallowTrailingClick();
      setItemKind(kind);
    };
    return <div className={styles.root}>
      <button className={styles.back} {...pressAction(() => { swallowTrailingClick(); setDetail(null); })}>‹ 返回列表</button>
      <div className={`hud-panel-enter ${styles.scroll}`} ref={scroll} key={entry.id}>
        <div className={styles.detailHead}>
          <span className={styles.detailIcon}><CreatureIcon id={entry.id} size={44} /></span>
          <span className={styles.detailTitle}>
            <strong>{entry.name}</strong>
            <span className={styles.tagRow}>{entry.tags.map((tag) => <span className={styles.detailTag} key={tag}>{tag}</span>)}</span>
          </span>
        </div>
        <p className={styles.desc}>{entry.description}</p>
        <TextSection title="出没地点" text={entry.habitat} />
        <TextSection title="习性与应对" text={entry.behavior} />
        <TextSection title="互动方式" text={entry.interaction} />
        <RelatedItems title={entry.id === 'cat' ? '伙伴觅食' : '驯养产出'} items={entry.produce} note={entry.productionNote} onOpen={openItem} />
        <RelatedItems title="击杀掉落" items={entry.drops} note={entry.dropNote} onOpen={openItem} />
        {entry.stats.length > 0 && <section className={styles.section}>
          <h4 className={styles.sectionTitle}>基础属性</h4>
          <div className={styles.stats}>{entry.stats.map((stat) => <div className={styles.statRow} key={stat.label}>
            <span className={styles.statLabel}>{stat.label}</span><span className={styles.statValue}>{stat.value}</span>
          </div>)}</div>
        </section>}
        <RelatedItems title="可投喂食物" items={entry.foods} onOpen={openItem} />
      </div>
      <div className={styles.pager}>
        <button {...pressAction(() => step(-1))} disabled={!multi}>‹ 上一种</button>
        <span className={styles.pagerPos}>{detail.index + 1}/{detail.entries.length}</span>
        <button {...pressAction(() => step(1))} disabled={!multi}>下一种 ›</button>
      </div>
    </div>;
  }

  const keyword = query.trim();
  // 完整标签优先精确匹配，避免「可驯养」同时命中「不可驯养」。
  const exactTag = CREATURE_ENTRIES.some((entry) => entry.tags.includes(keyword));
  const entries = CREATURE_ENTRIES.filter((entry) => entry.name.includes(keyword)
    || entry.tags.some((tag) => exactTag ? tag === keyword : tag.includes(keyword)));
  return <div className={styles.root}>
    <div className={styles.controls}>
      <input className={styles.search} value={query} onChange={(event) => { listTop.current = 0; if (scroll.current) scroll.current.scrollTop = 0; setQuery(event.target.value); }} placeholder="搜索生物名称或标签…" aria-label="搜索生物名称或标签" />
    </div>
    <div className={styles.scroll} ref={scroll}>
      {entries.length ? <div className={styles.creatureGrid}>{entries.map((entry, index) => <CreatureTile key={entry.id} entry={entry} onOpen={() => {
        listTop.current = scroll.current?.scrollTop ?? 0;
        detailTop.current = 0;
        swallowTrailingClick();
        setDetail({ entries, index });
      }} />)}</div> : <p className={styles.empty}>没有找到「{keyword}」相关的生物</p>}
    </div>
  </div>;
}
