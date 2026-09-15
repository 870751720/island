'use client';

import { useEffect, useRef, useState } from 'react';
import { LANDMARKS, type LandmarkKind } from '@/game/world/landmarks/LandmarkDefinitions';
import type { LandmarkPreviewScene } from '@/game/world/landmarks/preview/LandmarkPreviewScene';
import styles from './preview.module.css';

const descriptions: Record<LandmarkKind, string> = {
  camp: '残火堆小营 · 短挡风栏 · 单顶一级帐篷',
  fishing: '条形作业面 · 长晾网栏 · 单顶一级帐篷',
  farm: '双色田垄 · 偏置生活角 · 单顶一级帐篷',
  hunter: '错位挡栏 · 折线入口 · 单顶一级帐篷',
  workshop: 'L 形石墙 · 紧凑工作区 · 单顶一级帐篷',
  brewery: '酿酒桶与麦圃 · 半围合小院 · 单顶一级帐篷',
  village: '弯曲生活街巷 · 集中作业区 · 单顶一级帐篷',
  seaRuin: '三叉戟石脊 · 侧面断口 · 海神像',
  harvestRuin: '金色麦田后景 · 矮作物前景 · 收获通道',
  healingRuin: '八边水晶内院 · 断墙 · 中央留白',
  rainRuin: '层叠短墙 · 收窄仪式中轴 · 雨神祭坛',
  incenseRuin: '后侧石龛 · 双翼木防线 · 守门熏香',
};

export function LandmarkPreview() {
  const mount = useRef<HTMLDivElement>(null);
  const scene = useRef<LandmarkPreviewScene | null>(null);
  const [kind, setKind] = useState<LandmarkKind>('village');
  const [seed, setSeed] = useState(42);
  const [night, setNight] = useState(false);
  const nightRef = useRef(night); nightRef.current = night;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    import('@/game/world/landmarks/preview/LandmarkPreviewScene').then(({ LandmarkPreviewScene }) => {
      if (cancelled || !mount.current) return;
      scene.current = new LandmarkPreviewScene(mount.current, kind, seed);
      scene.current.setNight(nightRef.current); setLoading(false);
    }).catch(() => { if (!cancelled) { setError('预览加载失败，请刷新页面并确认浏览器支持 WebGL。'); setLoading(false); } });
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  }, [kind, seed]);
  useEffect(() => { scene.current?.setNight(night); }, [night]);
  return <main className={styles.page}>
    <header className={styles.header}>
      <div className={styles.eyebrow}>ISLAND / 地点设计</div>
      <h1>村落与遗迹预览场</h1>
      <p>同一份游戏模型与布局，先看清，再定稿。</p>
      <select aria-label="预览地点" value={kind} onChange={e => setKind(e.target.value as LandmarkKind)}>
        {LANDMARKS.map(item => <option key={item.kind} value={item.kind}>{item.name}</option>)}
      </select>
      <p className={styles.description}>{descriptions[kind]}</p>
    </header>
    <div className={styles.viewport}>
      <div ref={mount} className={styles.canvas} />
      {(loading || error) && <div role="status" className={styles.status}>{error || '正在搭建预览…'}</div>}
      <div className={styles.hint}>单指旋转 · 双指缩放</div>
    </div>
    <footer className={styles.footer}>
      <div className={styles.actions}>
        <button onClick={() => setNight(v => !v)} aria-pressed={night}>{night ? '切到白天' : '切到夜晚'}</button>
        <button onClick={() => scene.current?.zoom(1.25)} aria-label="放大">＋</button>
        <button onClick={() => scene.current?.zoom(0.8)} aria-label="缩小">－</button>
        <button onClick={() => scene.current?.reset()}>复位视角</button>
      </div>
      <div className={styles.seed}>
        <label>种子 <input aria-label="布局随机种子" type="number" min="0" max="999999" value={seed}
          onChange={e => setSeed(Math.min(999999, Math.max(0, Math.trunc(Number(e.target.value)) || 0)))} /></label>
        <button onClick={() => setSeed(v => (v + 1) % 1000000)}>换一组</button>
        <span>固定种子方便对比</span>
      </div>
      <p>独立展示场地，不读取或写入游戏存档。作物按成熟状态展示。</p>
    </footer>
  </main>;
}
