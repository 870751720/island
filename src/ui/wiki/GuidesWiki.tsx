'use client';
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { GUIDE_ENTRIES, guideSearchText, type GuideEntry, type GuideLink } from './guideWiki';
import { CreatureIcon } from './CreatureIcon';
import { CreaturesWiki } from './CreaturesWiki';
import { ItemsWiki } from './ItemsWiki';
import { WikiText } from './WikiText';
import { pressAction } from '../pressAction';
import { swallowTrailingClick, useScrollAreaTap } from './wikiTaps';
import styles from './WikiPanel.module.css';

function GuideCard({ entry, onOpen }: { entry: GuideEntry; onOpen: () => void }) {
  const tap = useScrollAreaTap(onOpen);
  return <button className={`${styles.tile} ${styles.guideCard}`} {...tap}>
    <strong>{entry.title}<span aria-hidden="true"> ›</span></strong>
    <span>{entry.summary}</span>
  </button>;
}

function GuideWord({ link, onOpen }: { link: GuideLink; onOpen: (link: GuideLink) => void }) {
  const tap = useScrollAreaTap(() => onOpen(link));
  if ('kind' in link) return <WikiText value={[link]} onOpen={() => onOpen(link)} />;
  return <button type="button" className={styles.itemWord} {...tap} aria-label={`查看${link.label}的生物详情`}>
    <CreatureIcon id={link.creature} size={18} /><span>{link.label}</span>
  </button>;
}

/** 指南保留自身阅读位置，物品内部与生物→物品的返回轨迹由原图鉴管理。 */
export function GuidesWiki({ onDetailChange }: { onDetailChange: (inDetail: boolean) => void }) {
  const [query, setQuery] = useState('');
  const [entry, setEntry] = useState<GuideEntry | null>(null);
  const [target, setTarget] = useState<GuideLink | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const listTop = useRef(0);
  const detailTop = useRef(0);
  const inDetail = entry !== null;
  useLayoutEffect(() => { onDetailChange(inDetail); }, [inDetail, onDetailChange]);
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = entry ? detailTop.current : listTop.current;
  }, [entry, target]);

  const openLink = (link: GuideLink) => {
    detailTop.current = scroll.current?.scrollTop ?? 0;
    swallowTrailingClick();
    setTarget(link);
  };
  if (target) return 'kind' in target
    ? <ItemsWiki key={target.kind} initialKind={target.kind} onDetailChange={onDetailChange} onExit={() => setTarget(null)} exitLabel="返回玩法指南" />
    : <CreaturesWiki key={target.creature} initialId={target.creature} onDetailChange={onDetailChange} onExit={() => setTarget(null)} />;

  if (entry) return <div className={styles.root}>
    <button className={styles.back} {...pressAction(() => { swallowTrailingClick(); setEntry(null); })}>‹ 返回指南列表</button>
    <div className={styles.scroll} ref={scroll}>
      <div className={styles.detailTitle}><strong>{entry.title}</strong></div>
      <p className={styles.desc}>{entry.summary}</p>
      {entry.sections.map((section, index) => <section className={styles.section} key={section.title}>
        <h4 className={styles.guideSectionTitle}>{index + 1}. {section.title}</h4>
        <p className={styles.desc}>{section.text.map((part, partIndex) => typeof part === 'string'
          ? <Fragment key={partIndex}>{part}</Fragment>
          : <GuideWord key={partIndex} link={part} onOpen={openLink} />)}</p>
      </section>)}
    </div>
  </div>;

  const keyword = query.trim();
  const entries = GUIDE_ENTRIES.filter((guide) => guideSearchText(guide).includes(keyword));
  return <div className={styles.root}>
    <div className={styles.controls}>
      <input className={styles.search} value={query} onChange={(event) => {
        listTop.current = 0;
        if (scroll.current) scroll.current.scrollTop = 0;
        setQuery(event.target.value);
      }} placeholder="搜索玩法或关键词…" aria-label="搜索玩法或关键词" />
    </div>
    <div className={styles.scroll} ref={scroll}>
      {entries.length ? entries.map((guide) => <GuideCard key={guide.id} entry={guide} onOpen={() => {
        listTop.current = scroll.current?.scrollTop ?? 0;
        detailTop.current = 0;
        swallowTrailingClick();
        setEntry(guide);
      }} />) : <p className={styles.empty}>没有找到「{keyword}」相关的玩法</p>}
    </div>
  </div>;
}
