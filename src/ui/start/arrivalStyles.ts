import { menuBackdrop, menuSurfaceColors } from './palette';
import { islandSceneCss } from './sceneStyles';

export const islandArrivalCss = `
${islandSceneCss}
.island-arrival{${menuSurfaceColors}position:absolute;inset:0;z-index:1000;background:${menuBackdrop};color:var(--ink);font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;overflow:auto;overscroll-behavior:contain;touch-action:pan-y;opacity:1;transition:opacity .6s ease;isolation:isolate}
.island-arrival *{box-sizing:border-box}
.island-arrival[data-ready=true]{opacity:0}
.arrival-layout{min-height:100%;width:min(100%,440px);margin:auto;display:flex;flex-direction:column;justify-content:center;padding:calc(26px + env(safe-area-inset-top)) calc(24px + env(safe-area-inset-right)) calc(30px + env(safe-area-inset-bottom)) calc(24px + env(safe-area-inset-left))}
.arrival-heading{text-align:center}
.arrival-brand{display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:700;letter-spacing:.18em}
.arrival-heading .menu-island{height:220px;margin:12px auto 0}
.arrival-caption{font-size:12px;letter-spacing:.12em;margin:0 0 24px;color:var(--muted)}
.arrival-panel{padding:24px 22px 12px;border:2px solid var(--menu-border);border-radius:24px;background:var(--menu-panel);box-shadow:var(--menu-shadow)}
.arrival-kicker{font-size:10px;letter-spacing:.2em;color:var(--muted);margin-bottom:12px}
.arrival-panel h1{font-size:23px;letter-spacing:.04em;margin:0;line-height:1.4}
.arrival-description{font-size:12px;line-height:1.7;color:var(--muted);margin:8px 0 20px}
.arrival-track{height:6px;border-radius:8px;overflow:hidden;background:#bdcec5;box-shadow:inset 0 1px 2px #49665e18}
.arrival-track span{display:block;width:40%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#a4c2d0,#496e87);animation:arrival-drift 1.8s ease-in-out infinite}
.arrival-tip{margin-top:22px;min-height:72px;animation:arrival-tip-in .22s ease-out}
.arrival-tip strong{font-size:12px;font-weight:700}
.arrival-tip p{font-size:12px;line-height:1.8;margin:7px 0 0;color:var(--muted)}
.arrival-next{width:100%;min-height:44px;display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid var(--line);border-radius:12px;background:var(--menu-surface);box-shadow:var(--menu-control-shadow);color:var(--ink);font:inherit;font-size:12px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .16s,box-shadow .16s}
.arrival-count{margin-left:auto;font-size:10px;color:var(--muted)}
.arrival-next:active{transform:translateY(2px) scale(.98);box-shadow:inset 0 2px 4px #61795722}
.arrival-next:focus-visible{outline:3px solid #416b86;outline-offset:4px}
.island-arrival[data-ready=true] .arrival-track span{animation:none;width:100%;transition:width .2s ease}
@keyframes arrival-drift{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}
@keyframes arrival-tip-in{from{opacity:.4;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@media(max-height:700px) and (orientation:portrait){.arrival-heading .menu-island{height:160px}.arrival-caption{margin-bottom:16px}.arrival-panel{padding-top:18px}.arrival-layout{padding-top:calc(16px + env(safe-area-inset-top))}}
@media(orientation:landscape){.arrival-layout{width:min(100%,820px);display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:28px}.arrival-heading .menu-island{height:180px}.arrival-caption{margin-bottom:0}}
@media(prefers-reduced-motion:reduce){.island-arrival,.island-arrival *{animation:none!important;transition:none!important}.arrival-track span{transform:translateX(75%)}}
`;
