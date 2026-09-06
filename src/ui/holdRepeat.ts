/** 进入连发前的时间(毫秒):按住短于该值视为点按 */
const HOLD_DELAY = 350;

export type HoldTapHandlers = {
  /** 短按松手时触发一次 */
  onTap: () => void;
  /** 长按连发中每个节拍触发,step 为当前步进 */
  onRepeat: (step: number) => void;
};

/** 长按连发调度:按住超过 350ms 进入连发,间隔从 160ms 随按住时长加速到 45ms,
 * 步进 0.8s 后升到 5、1.6s 后升到 10;返回停止函数,松手时调用(未进入连发则触发 onTap) */
export function startHoldTap({ onTap, onRepeat }: HoldTapHandlers): () => void {
  let repeated = false;
  const start = Date.now();
  const tick = () => {
    repeated = true;
    const held = Date.now() - start;
    onRepeat(held > 1600 ? 10 : held > 800 ? 5 : 1);
    timer = window.setTimeout(tick, Math.max(160 - held / 20, 45));
  };
  let timer = window.setTimeout(tick, HOLD_DELAY);
  return () => {
    clearTimeout(timer);
    if (!repeated) onTap();
  };
}
