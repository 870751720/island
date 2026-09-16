import { hudControlStyles } from './controlStyles';

/** 局部 HUD 表现：轻量渐变与 transform/opacity 动效，不使用背景模糊。 */
export const hudStyles = `
${hudControlStyles}
.hud-top-edge{top:max(7px,env(safe-area-inset-top))}
.hud-status{position:absolute;container:hud-status / inline-size;left:max(8px,env(safe-area-inset-left));display:flex;flex-direction:row;flex-wrap:wrap;align-items:flex-start;gap:4px;right:calc(max(10px,env(safe-area-inset-right)) + var(--hud-right-reserve));pointer-events:none;box-sizing:border-box;font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;color:#49665e}
.hud-status-stack{width:118px;flex-shrink:0;display:flex;flex-direction:column;gap:6px}
.hud-status-card{box-sizing:border-box;width:118px;flex-shrink:0;padding:3px 4px 4px;border:1px solid #fff9e8b3;border-radius:14px;background:linear-gradient(145deg,#fff9e4d9,#e2ecdad1);box-shadow:0 3px 9px #314c3e20,inset 0 1px 0 #ffffff99}
.quest-card{position:relative;box-sizing:border-box;width:min(154px,calc(100vw - var(--hud-right-reserve) - 28px));min-height:44px;border:1px solid #fff9e8b3;border-radius:11px;padding:6px 8px;background:linear-gradient(145deg,#fff9e4ee,#e2ecdae8);box-shadow:0 3px 9px #314c3e20;pointer-events:auto;touch-action:manipulation;cursor:pointer;text-align:left;color:#304d40;font-family:inherit;display:flex;flex-direction:column;gap:3px}.quest-card.is-collapsed{width:118px}.quest-card:active{background:#edf1db}.quest-card:focus-visible{outline:2px solid #547945;outline-offset:2px}
.quest-heading{padding-right:32px;display:flex;align-items:center;justify-content:space-between;gap:3px}.quest-heading>strong{font-size:12px;line-height:1.4;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.quest-toggle{position:absolute;right:0;top:0;z-index:2;width:44px;height:44px;border:0;background:transparent;font-size:16px;color:#53664e;touch-action:manipulation;cursor:pointer}.quest-navigate{position:absolute;inset:0;z-index:1;width:100%;height:100%;border:0;background:transparent;border-radius:inherit;cursor:pointer;touch-action:manipulation}.quest-navigate:focus-visible,.quest-toggle:focus-visible{outline:2px solid #547945;outline-offset:2px}.quest-caption{display:flex;justify-content:space-between;font-size:10px;line-height:1.3;color:#526649}.quest-caption>span:first-child{color:#725019;font-weight:700}
.quest-progress{display:flex;flex-direction:column;gap:1px}.quest-row{display:flex;justify-content:space-between;gap:4px;font-size:11px;line-height:1.4;color:#78501e}.quest-row>strong{font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap}.quest-row.is-complete{color:#357043}.quest-hint{font-size:10px;line-height:1.4;color:#53634c;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.quest-pending{font-size:10px;line-height:1.4;color:#865317}
.quest-feedback-anchor{position:absolute;left:0;top:0;width:max-content;visibility:hidden;pointer-events:none;z-index:25;font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif}.quest-feedback{font-size:13px;font-weight:600;line-height:1.4;white-space:nowrap;text-align:center;color:#fff2ce;text-shadow:0 1px 2px #302819cc,1px 0 1px #30281988,-1px 0 1px #30281988;animation:quest-complete 1.6s both}
@keyframes quest-complete{0%{opacity:0;transform:translateY(4px)}12.5%,75%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-10px)}}
@keyframes quest-complete-reduced{0%{opacity:0}12.5%,75%{opacity:1}100%{opacity:0}}
.quest-reward-flights{position:absolute;inset:0;pointer-events:none;z-index:260;overflow:hidden}.quest-reward-flight{position:absolute;display:flex;width:30px;height:30px;align-items:center;justify-content:center;filter:drop-shadow(0 2px 2px #314c3e55);animation:quest-reward-fly .85s both;will-change:transform,opacity}
@keyframes quest-reward-fly{0%{opacity:0;transform:translate(-50%,-50%) scale(.5)}15%{opacity:1;transform:translate(-50%,-80%) scale(1.1)}45%{opacity:1;transform:translate(calc(-50% + var(--flight-mid-x)),calc(-50% + var(--flight-mid-y))) scale(1)}90%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--flight-x)),calc(-50% + var(--flight-y))) scale(.25)}}
@keyframes quest-reward-reduced{0%,70%{opacity:1}100%{opacity:0}}
@media(prefers-reduced-motion:reduce){.quest-feedback{animation-name:quest-complete-reduced}.quest-reward-flight{animation-name:quest-reward-reduced;animation-duration:.4s;transform:translate(calc(-50% + var(--flight-x)),calc(-50% + var(--flight-y)))}}
@media(orientation:landscape) and (max-height:500px){.quest-card{padding:5px 7px;gap:2px}.quest-hint{display:none}}
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
.hud-day{display:flex;justify-content:center;align-items:center;gap:5px;width:108px;min-height:17px;flex-wrap:wrap;font-size:9px;white-space:nowrap;color:#496354}
.hud-day strong{font-size:10px;font-weight:600;font-variant-numeric:tabular-nums}
.hud-season{font-size:9px;display:flex;align-items:center;gap:4px}
.hud-season:before{content:"";width:4px;height:4px;border-radius:50%;background:var(--season-color);box-shadow:0 0 0 1px #5a796733}
.hud-phase{display:inline-flex;align-items:center;flex-shrink:0}
.hud-buffs{display:flex;flex-wrap:wrap;gap:4px;flex:1;min-width:26.4px;max-height:40dvh;overflow-y:auto;scrollbar-width:none;pointer-events:none;overscroll-behavior:contain}
.hud-buff{position:relative;box-sizing:border-box;flex:0 0 26.4px;pointer-events:auto;width:26.4px;height:26.4px;padding:0;display:flex;align-items:center;justify-content:center;border:1px solid #9dcca766;border-radius:7.8px;background:#fff5e2dd;color:#526857;cursor:pointer;font-size:11.4px;touch-action:manipulation;box-shadow:0 3px 9px #081c3424}
.hud-buff.is-bad{border-color:#ed998a99}
.hud-buff>*{pointer-events:none}
.hud-buff:active>span[aria-hidden]{transform:scale(.92)}
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
