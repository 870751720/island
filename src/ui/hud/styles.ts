import { hudControlStyles } from './controlStyles';

/** 局部 HUD 表现：轻量渐变与 transform/opacity 动效，不使用背景模糊。 */
export const hudStyles = `
${hudControlStyles}
.hud-status{position:absolute;top:max(7px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left));display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:118px;pointer-events:none;box-sizing:border-box;font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;color:#49665e}
.hud-status-card{box-sizing:border-box;width:118px;padding:3px 4px 4px;border:1px solid #fff9e8b3;border-radius:14px;background:linear-gradient(145deg,#fff9e4d9,#e2ecdad1);box-shadow:0 3px 9px #314c3e20,inset 0 1px 0 #ffffff99}
.hud-bottles{position:relative;display:flex;width:108px;height:55px}
.hud-bottle-canvas{position:absolute;left:0;top:0;width:108px;height:48px;pointer-events:none;opacity:0}
.hud-bottle-canvas.is-ready{opacity:1}
.hud-bottle{position:relative;width:36px;flex-shrink:0;height:55px;text-align:center}
.hud-bottle-meter,.hud-bottle-fallback{width:44px;height:48px;display:block}
.hud-bottle-meter{margin-left:-4px}
.hud-bottle-canvas.is-ready~.hud-bottle .hud-bottle-fallback{visibility:hidden}
.hud-bottle-tap{position:absolute;top:0;left:-4px;width:44px;height:48px;border:0;border-radius:12px;background:transparent;pointer-events:auto;touch-action:manipulation;cursor:pointer}
.hud-bottle-tap:active{background:#fff8e933}
.hud-bottle-label{display:block;margin-top:-4px;font-size:8px;font-weight:600;line-height:11px;letter-spacing:.06em;color:#40594f;text-shadow:0 1px 2px #fffbeccc,0 0 3px #fffbeccc}
.hud-bottle.is-low .hud-bottle-label{color:#a73d2e;animation:hud-low 1.8s ease-in-out infinite}
.hud-day{display:flex;justify-content:center;align-items:center;gap:10px;width:108px;height:17px;font-size:9px;white-space:nowrap;color:#496354}
.hud-day strong{font-size:10px;font-weight:600;font-variant-numeric:tabular-nums}
.hud-season{font-size:9px;display:flex;align-items:center;gap:4px}
.hud-season:before{content:"";width:4px;height:4px;border-radius:50%;background:var(--season-color);box-shadow:0 0 0 1px #5a796733}
.hud-buffs{display:flex;flex-wrap:wrap;gap:4px;max-width:calc(100vw - 20px - var(--hud-right-reserve));pointer-events:auto}
.hud-buff{position:relative;width:44px;height:44px;padding:0;display:flex;align-items:center;justify-content:center;border:1px solid #9dcca766;border-radius:13px;background:#fff5e2dd;color:#526857;cursor:pointer;font-size:19px;touch-action:manipulation;box-shadow:0 3px 9px #081c3424}
.hud-buff.is-bad{border-color:#ed998a99}
.hud-buff:active{transform:scale(.92)}
.hud-buff-time{position:absolute;right:2px;bottom:1px;background:#f5ebd5;font-size:9px;line-height:12px;padding:0 3px;border-radius:4px;font-variant-numeric:tabular-nums}
.hud-panel-enter{animation:hud-panel-in .2s ease-out}
@keyframes hud-panel-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes hud-icon-in{from{opacity:.4;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
@keyframes hud-hold{to{stroke-dashoffset:0}}
@keyframes hud-context-cue{from{opacity:.8;transform:scale(.98)}to{opacity:0;transform:scale(1.14)}}
@keyframes hud-low{50%{opacity:.5}}
@media(hover:hover){.hud-control:hover:not(:disabled){background:linear-gradient(145deg,#fffdf0,#eaf1de)}}
@media(max-width:350px){.hud-status{top:calc(max(10px,env(safe-area-inset-top)) + 50px)}}
@media(orientation:landscape) and (max-height:500px){.hud-backpack,.hud-tool{top:auto;bottom:max(30px,env(safe-area-inset-bottom))}.hud-backpack{right:calc(max(16px,env(safe-area-inset-right)) + 86px)}}
@media(prefers-reduced-motion:reduce){.hud-control,.hud-control *,.hud-status *,.hud-panel-enter{animation:none!important;transition:none!important}.hud-hold-ring rect{stroke-dashoffset:0}}
`;
