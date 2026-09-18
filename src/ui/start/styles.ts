import { menuBackdrop, menuActionColors, menuSurfaceColors } from './palette';
import { islandSceneCss } from './sceneStyles';

export const startScreenCss = `
.start-screen{${menuActionColors}${menuSurfaceColors}position:absolute;inset:0;height:calc(100 * var(--game-vh));overflow:hidden;touch-action:manipulation;background:${menuBackdrop};color:var(--ink);font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;isolation:isolate}
.start-screen *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.start-screen button:focus:not(:focus-visible){outline:none}
.start-screen button{font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .16s,background .2s,box-shadow .16s}
.start-screen button:active{transform:translateY(3px) scale(.98)}
.start-screen button:focus-visible{outline:3px solid #416b86;outline-offset:4px}
.start-layout{max-width:1200px;margin:auto;height:100%;min-height:0;padding:calc(16px + var(--game-safe-top)) calc(22px + var(--game-safe-right)) calc(18px + var(--game-safe-bottom)) calc(22px + var(--game-safe-left));display:flex;flex-direction:column}
.menu-topbar{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:44px;font-size:10px;letter-spacing:.06em}
.menu-brand{display:flex;align-items:center;gap:6px}
.menu-brand svg{width:20px;height:20px;flex-shrink:0}
.menu-sound{display:flex;gap:6px;align-items:center;justify-content:center;min-height:44px;padding:0 10px;color:#49665e;border:1px solid #8ca58450;border-radius:24px;background:#fff9e433;white-space:nowrap;font-size:10px!important}
.menu-sound svg{width:18px;height:18px}
.menu-content{flex:1;display:grid;grid-template-rows:minmax(0,1fr) auto;gap:8px;min-height:0;width:100%;max-width:440px;margin:0 auto;padding:18px 0 0}
.start-screen[data-ready=false] .menu-heading,.start-screen[data-ready=false] .menu-actions{animation:none}
.menu-heading{align-self:stretch;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0;text-align:center;animation:menu-enter .55s both;min-width:0}
.menu-heading>p,.menu-heading>h1{flex-shrink:0}
.menu-eyebrow{font-size:8px;letter-spacing:.25em;color:#60756a;margin:4px 0 10px}
.start-title{font-size:clamp(48px,calc(14.2 * var(--game-vw)),64px);font-weight:900;line-height:1.1;letter-spacing:-2px;margin:0;color:#fff9e4;text-shadow:0 1px 0 #fffdf0,0 3px 0 #98a57c,0 5px 0 #688367,0 9px 15px #456f5430;white-space:nowrap;transform:rotate(-3deg)}
.start-title>span{color:#f7d28f}
.start-subtitle{font-size:11px;line-height:1.8;letter-spacing:.13em;color:#49665e;margin:15px 0 0}
.menu-actions{position:relative;padding:18px 16px 7px;border:2px solid var(--menu-border);border-radius:24px;background:var(--menu-panel);box-shadow:var(--menu-shadow);animation:menu-enter .55s .12s both;min-width:0}
.menu-save-label{display:flex;justify-content:space-between;gap:5px;align-items:center;margin:0 2px 12px;font-size:10px;color:#657761}
.menu-save-label>span:first-child:before{content:'';display:inline-block;width:5px;height:5px;border-radius:50%;background:#729268;margin-right:6px}
.menu-save-label>span:last-child{font-size:9px}
.start-button{width:100%;min-height:67px;border:1px solid var(--action-border);border-radius:15px;background:var(--action-bg);box-shadow:0 5px 0 var(--action-shadow),0 8px 12px #344b5724,inset 0 2px 0 #fffbe644;display:flex;align-items:center;justify-content:space-between;padding:12px 17px;color:var(--action-text);text-align:left}
.start-button strong{display:block;font-size:20px;letter-spacing:.08em}
.start-button small{display:block;font-size:10px;font-weight:400;margin-top:5px;letter-spacing:.04em;color:#fff9e4;opacity:.85}
.start-button>svg{width:24px;height:24px;transition:transform .2s}
.start-button:active{box-shadow:0 1px 0 var(--action-shadow),inset 0 2px 5px #344b5733}
.start-mp{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:17px}
.mp-button{display:flex;align-items:center;justify-content:center;gap:8px;min-height:65px;padding:10px 8px;border:1px solid #8ca58450;border-radius:13px;background:linear-gradient(150deg,#fffdf0a8,#e3e9d1);color:#49665e;box-shadow:0 2px 0 #c2cfb2,inset 0 1px 0 #fffef1;text-align:left}
.mp-button:active{box-shadow:inset 0 2px 4px #61795722}
.mp-button>svg{width:21px;height:21px;flex-shrink:0}
.mp-button span{font-size:12px}
.mp-button small{display:block;margin-top:5px;font-size:9px;color:#657761}
.menu-utilities{display:flex;justify-content:center;align-items:center;gap:4px;margin-top:8px;flex-wrap:wrap}
.menu-utilities button{display:flex;align-items:center;justify-content:center;gap:4px;min-height:44px;border:0;background:transparent;color:#49665e;padding:0 7px;font-size:11px}
.menu-utilities svg{width:15px;height:15px}
.menu-utilities .legacy-button{color:#85643c}
.menu-footer{display:flex;justify-content:center;flex-wrap:wrap;gap:6px 16px;font-size:9px;letter-spacing:.12em;color:#536e65;padding-top:22px;line-height:1.8}
.menu-footer>span:last-child{font-size:7px;letter-spacing:.14em}
.start-notice{border:1px solid #c79e6570;border-radius:10px;padding:10px 12px;background:#fff0d4;color:#805d35;font-size:12px;line-height:1.6;margin:0 0 12px}
.start-loading{text-align:center;font-size:13px;letter-spacing:.15em;padding:25px 0}
.abandon-mask{position:fixed;inset:0;z-index:20;display:flex;overflow-y:auto;align-items:center;justify-content:center;padding:calc(24px + var(--game-safe-top)) 24px calc(24px + var(--game-safe-bottom));background:#1a322b8f}
.abandon-panel{width:min(100%,360px);max-height:100%;overflow:auto;padding:28px 23px;background:#fff9e4;border:1px solid #fff6df;border-radius:24px;box-shadow:0 20px 60px #122d3d44;text-align:center;animation:menu-enter .25s both}
.abandon-title{margin:0;color:#49665e;font-size:24px}
.abandon-text{color:#68715f;line-height:1.9;font-size:13px;margin:15px 0 22px}
.abandon-actions{display:flex;gap:10px}
.abandon-actions button{flex:1;min-height:48px;border-radius:12px;font-size:14px;font-weight:700}
.abandon-cancel{border:1px solid #55726040;background:#e9e9d8;color:#41614d}
.abandon-confirm{border:1px solid var(--action-border);background:var(--action-bg);color:var(--action-text)}
@keyframes menu-enter{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
${islandSceneCss}
.menu-heading .menu-island{flex:1 1 0;min-height:0;height:0;max-height:236px}
@media(hover:hover){.start-button:hover{background:var(--action-hover)}.mp-button:hover,.menu-sound:hover{background:#fff8e4b3}.start-button:hover>svg{transform:translateX(4px)}.menu-utilities button:hover{color:#294b41}}
@container game-viewport (min-width:760px) and (min-height:600px){.start-layout{padding:26px 50px 20px}.menu-content{max-width:1000px;grid-template-columns:1.15fr 1fr;grid-template-rows:minmax(0,1fr);gap:clamp(32px,calc(6 * var(--game-vw)),80px);align-items:center;padding:40px 0}.start-title{font-size:clamp(60px,calc(7 * var(--game-vw)),82px)}.start-subtitle{font-size:13px;margin-top:22px}.menu-heading .menu-island{max-height:300px;margin-top:8px}.menu-actions{padding:26px 22px 12px}.menu-eyebrow{font-size:9px}.menu-brand{font-size:12px}.menu-footer{font-size:10px;justify-content:space-between}}
@container game-viewport (max-height:720px) and (orientation:portrait){.start-layout{padding-top:calc(8px + var(--game-safe-top));padding-bottom:calc(12px + var(--game-safe-bottom))}.menu-content{gap:5px;padding-top:12px}.start-title{font-size:50px}.start-subtitle{margin-top:12px;font-size:10px}.menu-heading .menu-island{max-height:190px}.menu-actions{padding:15px 14px 6px}.start-button{min-height:62px}.mp-button{min-height:58px}.menu-footer{padding-top:17px}}
@container game-viewport (orientation:landscape) and (max-height:599px){.start-layout{padding:calc(8px + var(--game-safe-top)) calc(22px + var(--game-safe-right)) calc(8px + var(--game-safe-bottom)) calc(22px + var(--game-safe-left));min-height:0}.menu-content{max-width:850px;grid-template-columns:minmax(0,1fr) minmax(280px,340px);grid-template-rows:minmax(0,1fr);gap:20px;align-items:center;padding:8px 0}.start-title{font-size:43px}.menu-eyebrow{display:none}.start-subtitle{font-size:10px;margin-top:10px}.menu-heading .menu-island{max-height:148px;margin:0 auto}.menu-actions{padding:14px 14px 6px}.start-button{min-height:60px}.mp-button{min-height:56px}.menu-footer{padding-top:8px}.menu-utilities{margin-top:5px;gap:2px}.start-mp{margin-top:14px}}
@container game-viewport (orientation:portrait) and (max-height:560px){.menu-eyebrow,.start-subtitle,.menu-footer{display:none}.start-title{font-size:42px}.menu-content{padding-top:0}.menu-heading .menu-island{margin:0}}
@container game-viewport (orientation:landscape) and (max-height:450px){.menu-footer{display:none}.menu-actions{padding:10px 12px 4px}.start-button{min-height:52px}.mp-button{min-height:44px}.start-mp{margin-top:10px}.menu-utilities{margin-top:3px}.menu-save-label{margin-bottom:6px}.segment-row{margin-bottom:6px}}
@media(prefers-reduced-motion:reduce){.start-screen *,.start-screen *:before,.start-screen *:after{animation:none!important;transition:none!important}}
`;
