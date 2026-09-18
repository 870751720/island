/** 状态面板与食物恢复标签共用的属性配色。 */
export const VITAL_STYLES = [
  { key: 'health', label: '生命', warning: '危险', color: '#e94659' },
  { key: 'hunger', label: '饱食', warning: '饥饿', color: '#eaaa29' },
  { key: 'thirst', label: '水分', warning: '缺水', color: '#35b5dd' },
] as const;
