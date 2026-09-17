import { useEffect, useState } from 'react';
import { buffTraceEnabled, buffTraceReport, describeElement, traceBuff } from './buffInputTrace';

/** 仅 #buff-debug=1 启用，不改变业务事件的默认行为或传播。 */
export function BuffInputDiagnostics() {
  const [enabled, setEnabled] = useState(false);
  const [report, setReport] = useState('');
  useEffect(() => {
    if (!buffTraceEnabled()) return;
    setEnabled(true);
    traceBuff('diagnostics-start');
    let lastMove = 0;
    const record = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[data-buff-diagnostics]')) return;
      const pointer = event instanceof PointerEvent ? event : null;
      if (pointer?.type === 'pointermove') {
        if (!pointer.buttons || performance.now() - lastMove < 100) return;
        lastMove = performance.now();
      }
      const hud = document.querySelector<HTMLElement>('.hud-status');
      const list = document.querySelector<HTMLElement>('.hud-buffs');
      const mouse = event instanceof MouseEvent ? event : null;
      const candidates = mouse ? [...document.querySelectorAll<HTMLButtonElement>('[data-buff-id]')]
        .filter(button => {
          const rect = button.getBoundingClientRect();
          return mouse.clientX >= rect.left && mouse.clientX <= rect.right
            && mouse.clientY >= rect.top && mouse.clientY <= rect.bottom;
        }).map(button => ({ id: button.dataset.buffId, disabled: button.disabled,
          expanded: button.getAttribute('aria-expanded') })) : [];
      traceBuff(`native-${event.type}`, {
        target: describeElement(event.target), path: event.composedPath().slice(0, 5).map(describeElement),
        x: mouse?.clientX, y: mouse?.clientY, button: mouse?.button, detail: mouse?.detail,
        pointerId: pointer?.pointerId, pointerType: pointer?.pointerType, buttons: mouse?.buttons,
        defaultPrevented: event.defaultPrevented, trusted: event.isTrusted,
        hud: hud ? { inert: hud.inert, opacity: getComputedStyle(hud).opacity,
          pointerEvents: getComputedStyle(hud).pointerEvents } : null,
        scrollTop: list?.scrollTop, candidates,
        tipVisible: !!document.querySelector('[data-buff-tip]'),
        focused: describeElement(document.activeElement),
      });
    };
    const types = ['pointerdown', 'pointerup', 'pointercancel', 'pointermove', 'gotpointercapture',
      'lostpointercapture', 'click', 'focusin', 'scroll'];
    for (const type of types) document.addEventListener(type, record, { capture: true, passive: true });
    const visibility = () => traceBuff('visibility', { hidden: document.hidden });
    const blur = () => traceBuff('window-blur');
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', blur);
    return () => {
      for (const type of types) document.removeEventListener(type, record, true);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', blur);
    };
  }, []);
  if (!enabled) return null;
  const save = () => {
    const url = URL.createObjectURL(new Blob([report], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'buff-input-diagnostics.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div data-buff-diagnostics style={{ position: 'fixed', bottom: 'max(8px, var(--game-safe-bottom))',
    left: 8, zIndex: 500, width: report ? 'min(340px, calc(100 * var(--game-vw) - 16px))' : undefined,
    background: '#fff4df', color: '#304d40', padding: 8, borderRadius: 10, fontFamily: 'sans-serif' }}>
    <button style={{ minHeight: 44 }} onClick={() => setReport(buffTraceReport())}>记录刚才的 Buff 问题</button>
    {report && <>
      <p>记录已截取。保存文件发给我，或复制下面的文字。</p>
      <textarea readOnly value={report} aria-label="Buff 诊断记录" style={{ width: '100%', height: 140,
        boxSizing: 'border-box', userSelect: 'text' }} />
      <button style={{ minHeight: 44 }} onClick={save}>保存诊断文件</button>
      <button style={{ minHeight: 44 }} onClick={() => setReport('')}>收起</button>
    </>}
  </div>;
}
