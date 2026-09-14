import { hudControlStyles } from './controlStyles';

/** 局部 HUD 表现：轻量渐变与 transform/opacity 动效，不使用背景模糊。 */
export const hudStyles = `
${hudControlStyles}
.hud-top-edge{top:max(7px,env(safe-area-inset-top))}
.hud-status{position:absolute;container:hud-status / inline-size;left:max(8px,env(safe-area-inset-left));display:flex;flex-direction:row;flex-wrap:wrap;align-items:flex-start;gap:4px;right:calc(max(10px,env(safe-area-inset-right)) + var(--hud-right-reserve));pointer-events:none;box-sizing:border-box;font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;color:#49665e}
.hud-status-stack{width:118px;flex-shrink:0;display:flex;flex-direction:column;gap:6px}
.hud-status-card{box-sizing:border-box;width:118px;flex-shrink:0;padding:3px 4px 4px;border:1px solid #fff9e8b3;border-radius:14px;background:linear-gradient(145deg,#fff9e4d9,#e2ecdad1);box-shadow:0 3px 9px #314c3e20,inset 0 1px 0 #ffffff99}
.quest-card{box-sizing:border-box;width:min(190px,calc(100vw - var(--hud-right-reserve) - 28px));border:1px solid #fff9e8;border-radius:14px;padding:10px;background:linear-gradient(145deg,#fff9e4fa,#e2ecdaf5);box-shadow:0 3px 9px #314c3e20;pointer-events:none;color:#304d40;display:flex;flex-direction:column;gap:7px}
.quest-caption{display:flex;justify-content:space-between;font-size:11px;color:#53664e;font-weight:600}.quest-heading{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}.quest-heading>strong{font-size:14px;line-height:1.4}.quest-status{font-size:10px;font-weight:700;background:#d5e5bd;color:#365229;border-radius:5px;padding:2px 5px}
.quest-progress{display:flex;flex-direction:column;gap:5px}.quest-row{padding:5px 6px;background:#fffdf2;border:1px solid #bac8a6;border-radius:7px}.quest-row-label{display:flex;justify-content:space-between;align-items:baseline;gap:5px;font-size:12px;line-height:1.4}.quest-row-label>span{min-width:0;overflow-wrap:anywhere}.quest-row-label>strong{font-size:14px;white-space:nowrap;font-variant-numeric:tabular-nums;color:#304d40}.quest-row-bottom{display:flex;align-items:center;gap:7px;margin-top:3px;font-size:10px;color:#725523}.quest-row-bottom>span:last-child{white-space:nowrap}.quest-meter{flex:1;height:4px;overflow:hidden;border-radius:3px;background:#e5e8d9}.quest-meter>span{display:block;height:100%;background:#ab8344;border-radius:inherit;transition:width .25s ease}.quest-row.is-complete{background:#e2edd8;border-color:#9eb58d}.quest-row.is-complete .quest-row-bottom{color:#365b32}.quest-row.is-complete .quest-meter>span{background:#62854e}
.quest-hint{font-size:12px;line-height:1.5;color:#4b6045;overflow-wrap:anywhere}.quest-reward{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;font-size:10px;color:#596445}.quest-reward>span{display:inline-flex;align-items:center;gap:2px}
.quest-feedback{padding:7px;border-radius:8px;background:#e4edca;border:1px solid #91ab70;animation:quest-complete .45s ease-out}.quest-feedback>strong{display:block;font-size:12px;color:#355624;line-height:1.5}.quest-received{display:flex;flex-wrap:wrap;gap:4px 7px;font-size:11px;line-height:1.5}.quest-received>span{display:inline-flex;align-items:center;gap:3px}.quest-received>span:first-child{width:100%;font-weight:700;color:#38502b}.quest-pending{font-size:11px;line-height:1.5;color:#795019;background:#f5e8c8;border-radius:6px;padding:5px 6px}
@keyframes quest-complete{0%{opacity:0;transform:translateY(5px) scale(.96)}60%{transform:translateY(0) scale(1.025)}100%{opacity:1;transform:scale(1)}}
@media(orientation:landscape) and (max-height:500px){.quest-card{padding:6px 8px;gap:4px}.quest-card .quest-hint,.quest-card .quest-reward{display:none}.quest-row{padding:3px 5px}.quest-progress{gap:3px}}
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
.hud-buffs{display:flex;flex-wrap:wrap;gap:4px;flex:1;min-width:26.4px;max-height:40dvh;overflow-y:auto;scrollbar-width:none;pointer-events:none;overscroll-behavior:contain}
.hud-buff{position:relative;box-sizing:border-box;flex:0 0 26.4px;pointer-events:auto;width:26.4px;height:26.4px;padding:0;display:flex;align-items:center;justify-content:center;border:1px solid #9dcca766;border-radius:7.8px;background:#fff5e2dd;color:#526857;cursor:pointer;font-size:11.4px;touch-action:manipulation;box-shadow:0 3px 9px #081c3424}
.hud-buff.is-bad{border-color:#ed998a99}
.hud-buff:active{transform:scale(.92)}
.hud-buff-time{position:absolute;right:1.2px;bottom:.6px;background:#f5ebd5;font-size:5.4px;line-height:7.2px;padding:0 1.8px;border-radius:2.4px;font-variant-numeric:tabular-nums}
.hud-panel-enter{animation:hud-panel-in .2s ease-out}
@keyframes hud-panel-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes hud-icon-in{from{opacity:.4;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
@keyframes hud-hold{to{stroke-dashoffset:0}}
@keyframes hud-context-cue{from{opacity:.8;transform:scale(.98)}to{opacity:0;transform:scale(1.14)}}
@keyframes hud-low{50%{opacity:.5}}
@media(hover:hover){.hud-control:hover:not(:disabled){background:linear-gradient(145deg,#fffdf0,#eaf1de)}}
@container hud-status (max-width:148px){.hud-status-stack{order:1}.hud-buffs{flex-basis:100%}}
@media(orientation:landscape) and (max-height:500px){.hud-backpack,.hud-tool{top:auto;bottom:max(30px,env(safe-area-inset-bottom))}.hud-backpack{right:calc(max(16px,env(safe-area-inset-right)) + 86px)}}
@media(prefers-reduced-motion:reduce){.hud-control,.hud-control *,.hud-status *,.hud-panel-enter{animation:none!important;transition:none!important}.hud-hold-ring rect{stroke-dashoffset:0}}
`;
