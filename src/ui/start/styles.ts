import { menuBackdrop, menuActionColors } from './palette';

export const startScreenCss = `
.start-screen{${menuActionColors}position:absolute;inset:0;overflow:auto;touch-action:pan-y;background:#103e43;color:#fff2d4;font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;isolation:isolate}
.start-screen *{box-sizing:border-box}
.start-screen button{font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .2s,background .2s,box-shadow .2s}
.start-screen button:active{transform:scale(.97)}
.start-screen button:focus-visible{outline:3px solid #afd8ed;outline-offset:4px}
.start-atmosphere{position:absolute;inset:0;min-height:100%;z-index:-2;overflow:hidden;background:${menuBackdrop}}
.start-atmosphere:before{content:"";position:absolute;width:76vmax;height:76vmax;left:42%;top:12%;border:1px solid #c4ead015;border-radius:50%;box-shadow:0 0 0 45px #c4ead006,0 0 0 90px #c4ead008,0 0 0 150px #c4ead005;transform:rotateX(55deg);animation:menu-tide 14s ease-in-out infinite}
.start-atmosphere:after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 52% 45%,transparent 25%,#092d344d);pointer-events:none}
@keyframes menu-tide{50%{transform:translate(-20px,12px) rotateX(55deg) scale(1.06);opacity:.55}}
.menu-birds{position:absolute;top:20%;left:80%;display:flex;gap:18px;animation:menu-birds 18s ease-in-out infinite;opacity:.7}
.menu-birds i{width:16px;height:7px;border-top:2px solid #a7caba;border-radius:50%;transform:rotate(15deg)}
.menu-birds i:after{content:"";display:block;width:16px;height:7px;border-top:2px solid #a7caba;border-radius:50%;margin-left:14px;transform:rotate(-25deg)}
.menu-birds i:nth-child(2){margin-top:-15px;transform:scale(.7)}
.menu-birds i:nth-child(3){margin-top:9px;transform:scale(.6)}
.start-layout{max-width:1200px;margin:auto;min-height:100%;padding:calc(16px + env(safe-area-inset-top)) 24px calc(12px + env(safe-area-inset-bottom));display:flex;flex-direction:column}
.menu-topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:44px;font-size:11px;color:#e2e4cc;letter-spacing:.06em}
.menu-brand{display:flex;align-items:center;gap:8px}
.menu-brand svg{width:23px;height:23px}
.menu-sound{display:flex;gap:7px;align-items:center;justify-content:center;min-height:44px;padding:0 11px;color:#f8ebce;border:1px solid #e7efd22b;border-radius:24px;background:#173c454d;white-space:nowrap;font-size:11px!important}
.menu-sound svg{width:17px;height:17px}
.menu-content{flex:1;display:grid;grid-template-rows:auto auto;gap:32px;align-content:center;width:100%;max-width:440px;margin:0 auto;padding:32px 0}
.menu-heading{text-align:center;padding-top:0;animation:menu-enter .9s both}
.menu-eyebrow{font-size:9px;letter-spacing:.25em;color:#ead8b4;margin:0 0 12px}
.start-title{font-family:"STKaiti","KaiTi","Songti SC",serif;font-size:clamp(52px,15vw,76px);font-weight:900;line-height:1.15;letter-spacing:.02em;margin:0;text-shadow:0 4px 24px #102f3a40;white-space:nowrap}
.start-title>span{display:inline-block;position:relative;color:#ffcc88;transform:rotate(-7deg);margin-left:3px}
.start-title svg{position:absolute;bottom:-6px;left:-6%;width:110%;height:12px;stroke:#f6bb72;stroke-width:3;fill:none}
.start-title>i{font-style:normal;font-size:.45em;margin-left:-.12em;color:#ffd99a}
.start-subtitle{font-size:12px;line-height:1.9;letter-spacing:.15em;color:#e1e6d4;margin:18px 0 0}
.menu-emblem{display:flex;align-items:center;justify-content:center;width:54px;height:54px;margin:0 auto 22px;border:1px solid #e9d6ab45;border-radius:50%;color:#edcd96;box-shadow:0 0 0 7px #e9d6ab06}
.menu-emblem svg{width:28px;height:28px}
.menu-actions{position:relative;padding:20px 18px 10px;border:1px solid #d9e5cf26;border-radius:24px;background:linear-gradient(145deg,#436e684a,#123b4366);box-shadow:0 18px 48px #06272d24,inset 0 1px 0 #fff5da0a;animation:menu-enter .9s .2s both}
.menu-save-label{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:0 3px 10px;font-size:10px;letter-spacing:.07em;color:#d0d9c6}
.menu-save-label>span:last-child{font-size:9px;color:#aec8be}
.start-button{width:100%;min-height:70px;border:1px solid var(--action-border);border-radius:16px;background:var(--action-bg);box-shadow:0 5px 0 var(--action-shadow),0 12px 30px #051e2b40,inset 0 1px 0 #a9c7d4;display:flex;align-items:center;justify-content:space-between;padding:12px 21px;color:var(--action-text);text-align:left}
.start-button strong{display:block;font-size:21px;letter-spacing:.12em}
.start-button small{display:block;font-size:10px;font-weight:400;margin-top:5px;letter-spacing:.09em;color:#e0edf4}
.start-button>svg{width:28px;height:28px;transition:transform .3s}
.start-button:active{box-shadow:0 2px 0 var(--action-shadow)}
.start-mp{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:19px}
.mp-button{display:flex;align-items:center;justify-content:center;gap:11px;min-height:66px;border:1px solid #e2edcc36;border-radius:13px;background:#204e50a6;color:#f6edd4;text-align:left}
.mp-button>svg{color:#dfcf9f;width:21px;height:21px}
.mp-button span{font-size:13px;letter-spacing:.05em}
.mp-button small{display:block;margin-top:5px;font-size:9px;color:#bdd0c4;letter-spacing:.03em}
.menu-utilities{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap}
.menu-utilities button{display:flex;align-items:center;justify-content:center;gap:5px;min-height:44px;border:0;background:transparent;color:#d3d8bd;padding:0 8px;font-size:11px}
.menu-utilities svg{width:16px;height:16px}
.menu-utilities .legacy-button{color:#f2cb8d}
.menu-footer{display:flex;justify-content:space-between;gap:12px;font-size:8px;letter-spacing:.1em;color:#a3bdb5;padding-top:12px;line-height:1.8}
.menu-footer>span:last-child{font-size:7px;letter-spacing:.14em}
.start-notice{border:1px solid #ffd29270;border-radius:10px;padding:10px 12px;background:#423d2ce6;color:#ffe0ac;font-size:12px;line-height:1.6;margin:0 0 12px}
.start-loading{text-align:center;font-size:13px;letter-spacing:.15em;padding:25px 0}
.abandon-mask{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:24px;background:#09282bd9;backdrop-filter:blur(6px)}
.abandon-panel{width:min(100%,360px);padding:28px 23px;background:#fbf0d9;border:1px solid #fff6df;border-radius:22px;box-shadow:0 20px 80px #001c3a55;text-align:center;animation:menu-enter .25s both}
.abandon-title{margin:0;color:#3f5145;font-size:24px}
.abandon-text{color:#68715f;line-height:1.9;font-size:13px;margin:15px 0 22px}
.abandon-actions{display:flex;gap:10px}
.abandon-actions button{flex:1;min-height:48px;border-radius:12px;font-size:14px;font-weight:700}
.abandon-cancel{border:1px solid #55726040;background:#e9e9d8;color:#41614d}
.abandon-confirm{border:1px solid var(--action-border);background:var(--action-bg);color:var(--action-text)}
@keyframes menu-enter{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes menu-birds{50%{transform:translate(36px,-8px)}}
@media(hover:hover){.start-button:hover{background:var(--action-hover)}.mp-button:hover,.menu-sound:hover{background:#467273b3}.start-button:hover>svg{transform:translateX(4px)}.menu-utilities button:hover{color:#fff4cc}}
@media(min-width:760px) and (min-height:600px){.start-layout{padding:26px 50px 20px}.menu-content{max-width:1000px;grid-template-columns:1fr 1fr;grid-template-rows:auto;gap:clamp(32px,6vw,88px);align-items:center;padding:60px 0}.menu-heading{text-align:left}.menu-emblem{margin:0 0 30px;width:64px;height:64px}.menu-emblem svg{width:32px;height:32px}.start-title{font-size:clamp(64px,7vw,86px)}.start-subtitle{font-size:14px;margin-top:26px}.menu-actions{padding:28px 24px 16px}.menu-eyebrow{font-size:10px;letter-spacing:.2em}.menu-brand{font-size:12px}.menu-footer{font-size:10px}.menu-footer>span:last-child{font-size:9px}}
@media(max-height:720px) and (orientation:portrait){.start-layout{padding-top:calc(8px + env(safe-area-inset-top));padding-bottom:calc(8px + env(safe-area-inset-bottom))}.menu-content{gap:24px;padding:24px 0}.menu-emblem{width:44px;height:44px;margin-bottom:16px}.menu-emblem svg{width:24px;height:24px}.start-title{font-size:54px}.start-subtitle{margin-top:14px;font-size:11px}.menu-eyebrow{margin-bottom:8px;font-size:8px}.menu-actions{padding:16px 14px 8px}.start-button{min-height:62px}.mp-button{min-height:58px}.menu-footer{padding-top:2px}}
@media(orientation:landscape) and (max-height:599px){.start-layout{padding:calc(8px + env(safe-area-inset-top)) calc(22px + env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom)) calc(22px + env(safe-area-inset-left));min-height:360px}.menu-topbar{min-height:44px}.menu-content{max-width:850px;grid-template-columns:minmax(0,1fr) minmax(280px,340px);grid-template-rows:auto;gap:24px;align-items:center;padding:16px 0}.menu-emblem{width:40px;height:40px;margin-bottom:16px}.menu-emblem svg{width:23px;height:23px}.start-title{font-size:46px}.menu-eyebrow{font-size:7px;margin-bottom:6px}.start-subtitle{font-size:10px;margin-top:14px}.menu-actions{padding:16px 14px 8px}.start-button{min-height:60px}.mp-button{min-height:56px}.menu-footer{padding-top:2px}.menu-utilities{margin-top:5px;gap:6px}.start-mp{margin-top:14px}}
@media(prefers-reduced-motion:reduce){.start-screen *,.start-screen *:before,.start-screen *:after{animation:none!important;transition:none!important}}
`;
