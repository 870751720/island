'use client';
import { useState, type ComponentType } from 'react';
import styles from './WikiPanel.module.css';
import { MenuIcon } from '../icons/MenuIcons';
import { pressAction } from '../pressAction';
import { swallowTrailingClick } from './wikiTaps';
import { ItemsWiki } from './ItemsWiki';

/** 图鉴顶层分类;后续新分类在此登记,导航与内容切换自动生效 */
const WIKI_CATEGORIES: readonly { id: string; label: string; component: ComponentType }[] = [
  { id: 'items', label: '物品', component: ItemsWiki },
];

/** 游戏图鉴:从设置面板进入的全屏弹层,分类浏览游戏内容;当前提供「物品」分类 */
export function WikiPanel({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState(WIKI_CATEGORIES[0]!.id);
  const active = WIKI_CATEGORIES.find((c) => c.id === category) ?? WIKI_CATEGORIES[0]!;
  const Content = active.component;
  // 关闭会让手指下方变回设置面板,吞掉尾随 click 避免误触(如同样在右上角的关闭按钮)。
  const close = () => {
    swallowTrailingClick();
    onClose();
  };
  return (
    <div
      className={styles.overlay}
      onPointerDown={(event) => {
        // 入口在 pointerdown 打开面板，松手产生的 click 不应关闭新遮罩。
        if (event.button === 0 && event.target === event.currentTarget) close();
      }}
    >
      <div
        className={`hud-panel-enter ${styles.panel}`}
        role="dialog" aria-modal="true" aria-label="游戏图鉴"
      >
        <div className={styles.header}>
          <strong><MenuIcon name="book" /> 游戏图鉴</strong>
          <button className={styles.close} {...pressAction(close)} aria-label="关闭图鉴">×</button>
        </div>
        <nav className={styles.categories} aria-label="图鉴分类">
          {WIKI_CATEGORIES.map((c) => (
            <button key={c.id} aria-pressed={category === c.id} {...pressAction(() => setCategory(c.id))}>{c.label}</button>
          ))}
        </nav>
        <div className={styles.content} key={active.id}>
          <Content />
        </div>
      </div>
    </div>
  );
}
