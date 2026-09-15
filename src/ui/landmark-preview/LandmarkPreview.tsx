'use client';

import { useEffect, useRef, useState } from 'react';
import { LANDMARKS, type LandmarkKind } from '@/game/world/landmarks/LandmarkDefinitions';
import type { LandmarkPreviewScene } from '@/game/world/landmarks/preview/LandmarkPreviewScene';
import styles from './preview.module.css';

const descriptions: Partial<Record<LandmarkKind, string>> = {
  village: '开放聚落 · 中央火堆 · 农田与生产分区',
  seaRuin: '阶梯形回廊 · 正面开口 · 海神像',
  harvestRuin: '四片田圃 · 中央步道 · 蜂巢神龛',
  healingRuin: '疏落环形石阵 · 中央水晶 · 安静留白',
  rainRuin: '四角石墙 · 十字通道 · 雨神祭坛',
  incenseRuin: '木围栏防线 · 狭窄入口 · 防鳄熏香',
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
      <p className={styles.description}>{descriptions[kind] ?? '生活小院 · 帐篷与专业设施'}</p>
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
