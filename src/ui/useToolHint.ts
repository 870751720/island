import { useEffect, useState } from 'react';

const STORAGE_KEY = 'island.toolPickerLearned';
let learnedThisSession = false;

/** 操作教学独立于世界存档，新开游戏时继续保留。 */
export function useToolHint(pickerOpen: boolean): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      learnedThisSession ||= localStorage.getItem(STORAGE_KEY) === '1';
    } catch { /* 存储不可用时仍保留当前会话的学习状态。 */ }
    setVisible(!learnedThisSession);
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    learnedThisSession = true;
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* 不阻断选择面板的正常操作。 */ }
  }, [pickerOpen]);

  return visible;
}
