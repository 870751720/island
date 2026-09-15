/** 原生事件委托也供离线预览使用；每处同时只播放一次，卸载清理定时器。 */
export function attachMenuEggs(root: HTMLElement): () => void {
  const timers = new Map<Element, ReturnType<typeof setTimeout>>();
  const trigger = (event: Event) => {
    if (document.hidden || root.querySelector('.start-layout[inert]')) return;
    const target = (event.target as Element).closest<HTMLElement>('[data-egg]');
    if (!target || !root.contains(target) || timers.has(target)) return;
    if (event instanceof KeyboardEvent) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
    }
    if (target.dataset.egg === 'sea' && event instanceof MouseEvent) {
      const svg = target.closest('svg');
      const matrix = svg?.getScreenCTM();
      const ripple = target.querySelector<SVGElement>('.egg-ripple');
      if (svg && matrix && ripple) {
        const point = svg.createSVGPoint();
        point.x = event.clientX; point.y = event.clientY;
        const local = point.matrixTransform(matrix.inverse());
        for (const ellipse of ripple.querySelectorAll('ellipse')) {
          ellipse.setAttribute('cx', String(local.x));
          ellipse.setAttribute('cy', String(local.y));
        }
        ripple.style.transformOrigin = `${local.x}px ${local.y}px`;
      }
    }
    target.setAttribute('data-active', 'true');
    timers.set(target, setTimeout(() => {
      target.removeAttribute('data-active');
      timers.delete(target);
    }, 2200));
  };
  root.addEventListener('click', trigger);
  root.addEventListener('keydown', trigger);
  return () => {
    root.removeEventListener('click', trigger);
    root.removeEventListener('keydown', trigger);
    for (const [element, timer] of timers) { clearTimeout(timer); element.removeAttribute('data-active'); }
  };
}

export const menuEggCss = `
.menu-island{pointer-events:auto}
[data-egg]{cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
[data-egg]:focus-visible{outline:2px solid #496e87;outline-offset:3px}
.egg-hit{fill:transparent;stroke:none}.egg-leaf,.egg-spark,.egg-dog,.egg-ripple,.egg-bird{opacity:0;pointer-events:none}
.egg-crown{transform-origin:0 -30px}
[data-egg=tree][data-active] .egg-crown{animation:egg-sway .7s ease-in-out}
[data-egg=tree][data-active] .egg-leaf{animation:egg-leaf 1.8s ease-out}
[data-egg=tent][data-active] .egg-dog{animation:egg-peek 2.2s ease-in-out}
[data-egg=sea][data-active] .egg-ripple{animation:egg-ripple 2s ease-out;transform-origin:190px 224px}
[data-egg=fire][data-active] .egg-spark{animation:egg-spark 1.4s ease-out}
[data-egg=fire][data-active] .flame{animation:egg-fire .9s ease-in-out}
.egg-title{position:relative;display:inline-block}
.egg-title[data-active]{animation:egg-title .65s ease-in-out}
.egg-title .egg-bird{position:absolute;top:-17px;right:2px;width:28px;height:25px}
.egg-title[data-active] .egg-bird{animation:egg-visit 2.2s ease-in-out}
@keyframes egg-sway{20%{transform:rotate(-8deg)}45%{transform:rotate(7deg)}70%{transform:rotate(-4deg)}}
@keyframes egg-leaf{0%{opacity:0;transform:translate(0,-15px)}20%{opacity:1}100%{opacity:0;transform:translate(18px,30px) rotate(35deg)}}
@keyframes egg-peek{0%,100%{opacity:0;transform:translateY(25px)}20%,75%{opacity:1;transform:translateY(0)}45%{transform:translateY(-2px)}}
@keyframes egg-ripple{0%{opacity:.9;transform:scale(.3)}100%{opacity:0;transform:scale(1.7)}}
@keyframes egg-spark{0%{opacity:0;transform:translateY(6px)}20%{opacity:1}100%{opacity:0;transform:translateY(-28px)}}
@keyframes egg-fire{40%{transform:scale(1.1,1.5)}75%{transform:scale(.9,.95)}}
@keyframes egg-title{35%{transform:translateY(-7px) rotate(5deg)}70%{transform:translateY(2px) rotate(-2deg)}}
@keyframes egg-visit{0%,100%{opacity:0;transform:translate(20px,-15px)}25%,80%{opacity:1;transform:translate(0,0)}}
@media(prefers-reduced-motion:reduce){[data-egg][data-active] .egg-leaf,[data-egg][data-active] .egg-dog,[data-egg][data-active] .egg-ripple,[data-egg][data-active] .egg-spark,[data-egg][data-active] .egg-bird{opacity:1;animation:none!important}.egg-title[data-active],.egg-crown{animation:none!important}}
`;
