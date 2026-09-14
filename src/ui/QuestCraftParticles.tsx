import styles from './QuestCraftParticles.module.css';

/** 固定六枚光点沿卡片轮廓运行，不参与触控或布局。 */
export function QuestCraftParticles() {
  return <span className={styles.orbit} aria-hidden="true">
    {Array.from({ length: 6 }, (_, i) => <span key={i} className={styles.particle} style={{ animationDelay: `${-i * 0.8}s`, offsetDistance: `${i * 100 / 6}%` }} />)}
  </span>;
}
