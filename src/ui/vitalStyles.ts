/** 状态面板与食物恢复标签共用的属性配色。 */
export const VITAL_STYLES = [
  { key: 'health', label: '生命', warning: '危险', color: '#e94659', textColor: '#a53847' },
  { key: 'hunger', label: '饱食', warning: '饥饿', color: '#eaaa29', textColor: '#876016' },
  { key: 'thirst', label: '水分', warning: '缺水', color: '#35b5dd', textColor: '#24728a' },
] as const;
