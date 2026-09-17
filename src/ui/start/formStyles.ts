import { menuBackdrop, menuActionColors, menuSurfaceColors } from './palette';

/** 开始页子界面的共享配色、控件与响应式布局。 */
export const menuFormsCss = `
.profile-mask,.room-lobby{${menuActionColors}${menuSurfaceColors}color:var(--ink);font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;box-sizing:border-box}
.profile-mask *,.room-lobby *{box-sizing:border-box}
.profile-mask button,.room-lobby button{font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:background .2s,transform .2s,box-shadow .2s}
.profile-mask button:active:not(:disabled),.room-lobby button:active:not(:disabled){transform:translateY(3px) scale(.98)}
.profile-mask button:focus-visible,.room-lobby button:focus-visible{outline:3px solid #416b86;outline-offset:3px}
.profile-mask{position:fixed;inset:0;z-index:30;display:flex;overflow-y:auto;padding:calc(20px + var(--game-safe-top)) 20px calc(20px + var(--game-safe-bottom));background:linear-gradient(160deg,#d2e3e9ed,#a8c8dbf5 53%,#8cb4cef5)}
.profile-panel,.room-panel{position:relative;width:100%;margin:auto;padding:28px 24px;background:var(--menu-panel);border:2px solid var(--menu-border);border-radius:24px;box-shadow:var(--menu-shadow);text-align:center;animation:form-arrive .35s ease-out both}
.profile-panel{max-width:400px}
.form-emblem{display:flex;align-items:center;justify-content:center;width:48px;height:48px;margin:0 auto 14px;border:1px solid #fffce7c9;border-radius:16px;background:var(--menu-selected);color:#496e87;box-shadow:0 3px 0 #a4bdc5,inset 0 2px 0 #fffdf299}
.form-emblem svg{width:23px;height:23px}
.form-eyebrow{font-size:9px;letter-spacing:.15em;line-height:1.8;color:#71806c;margin:0 0 12px}
.profile-title,.room-panel h2{font-family:inherit;font-size:28px;font-weight:800;letter-spacing:.03em;color:var(--ink);margin:0}
.profile-subtitle,.room-subtitle{margin:10px 0 24px;font-size:12px;line-height:1.8;color:var(--muted)}
.profile-field-name,.room-label{display:block;margin:20px 0 9px;text-align:left;font-size:12px;font-weight:700;letter-spacing:.08em}
.profile-name-box{display:flex;align-items:center;border:1px solid var(--line);border-radius:12px;background:#fffaf0}
.profile-name-input{width:100%;min-width:0;min-height:54px;padding:0 14px;border:0;border-radius:12px;background:transparent;color:var(--ink);font-family:inherit;font-size:16px}
.profile-name-input:focus{outline:none}
.profile-name-count{padding-right:14px;color:var(--muted);font-size:11px;white-space:nowrap}
.profile-name-box:focus-within,.room-code-input:focus{outline:2px solid #668ca3;outline-offset:2px}
.profile-name-input::placeholder,.room-code-input::placeholder{color:#8c9787}
.profile-gender{display:flex;gap:12px}
.gender-card{flex:1;display:flex;gap:10px;justify-content:center;align-items:center;min-height:64px;border:1px solid var(--line);border-radius:12px;background:var(--menu-surface);color:var(--ink);box-shadow:var(--menu-control-shadow)}
.gender-card.selected{background:var(--menu-selected);border-color:var(--menu-selection);color:#345469;box-shadow:0 2px 0 #a4bdc5,inset 0 0 0 1px var(--menu-selection)}
.gender-card-dot{width:15px;height:15px;border:1px solid #859985;border-radius:50%}
.selected .gender-card-dot{border:4px solid #668ca3;background:#fff2d4}
.profile-confirm,.room-button{width:100%;min-height:54px;margin-top:22px;border:1px solid var(--action-border);border-radius:15px;background:var(--action-bg);color:var(--action-text);font-weight:700!important;letter-spacing:.08em;box-shadow:0 5px 0 var(--action-shadow),0 8px 12px #344b5724,inset 0 2px 0 #fffbe644}
.profile-confirm:disabled,.room-button:disabled{background:var(--menu-disabled);border-color:#c7d1c3;color:#6b7a6d;box-shadow:0 3px 0 #b8c6b3;cursor:default}
.profile-cancel,.room-back{width:100%;min-height:44px;margin-top:15px;background:transparent;border:0;border-radius:10px;color:#587263;font-size:13px!important}
.room-lobby{position:absolute;inset:0;overflow-y:auto;background:${menuBackdrop};padding:calc(24px + var(--game-safe-top)) calc(20px + var(--game-safe-right)) calc(24px + var(--game-safe-bottom)) calc(20px + var(--game-safe-left));display:flex}
.room-layout{width:100%;max-width:440px;margin:auto}
.room-intro{color:var(--ink);padding:0 6px 24px}
.room-brand{display:flex;gap:8px;align-items:center;font-size:13px;letter-spacing:.12em;margin-bottom:24px}
.room-intro>.form-eyebrow,.room-intro>h1,.room-intro>p:not(.form-eyebrow),.room-intro-foot{display:none}
.room-panel{margin:0}
.room-resume{display:flex;align-items:center;gap:12px;min-height:66px;padding:12px;background:var(--menu-surface);box-shadow:var(--menu-control-shadow);border:1px solid var(--line);border-radius:12px;text-align:left;font-size:13px;line-height:1.7}
.room-resume input{flex-shrink:0;width:22px;height:22px;accent-color:#668ca3}
.room-code-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 12px;border:1px solid #a4c2d0;border-radius:18px;background:linear-gradient(145deg,#fffdf0,#e2eef0);box-shadow:inset 0 2px 0 #fffdf2}
.room-code-card .form-eyebrow{margin:0}
.room-code-card strong{font:700 36px monospace;letter-spacing:.2em;padding-left:.2em;color:#496e87}
.room-code-card small{font-size:11px;color:var(--muted);line-height:1.6}
.room-qr{width:min(calc(45 * var(--game-vw)),168px);height:auto;border-radius:8px}
.room-code-input{width:100%;min-height:64px;border:1px solid var(--line);border-radius:12px;background:#fffaf0;color:var(--ink);text-align:center;font:700 28px monospace;letter-spacing:.18em}
.room-name-row{display:flex;align-items:center;gap:10px;width:100%;min-height:54px;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:#fffaf0;color:var(--ink);text-align:left}
.room-name-row span{flex:1;overflow-wrap:anywhere}.room-name-row small{font-size:11px;color:var(--muted);white-space:nowrap}.room-name-row svg{flex-shrink:0}
.room-name-row.unset{border-style:dashed}
.room-players{margin-top:22px;padding:14px 16px;background:var(--menu-surface);border:1px solid var(--line);border-radius:15px;text-align:left;font-size:13px;overflow-wrap:anywhere}
.room-players p{margin:9px 0 0}.connected{color:#3b6652}.waiting{color:#6f7b65}
.waiting span{display:inline-block;width:7px;height:7px;border-radius:50%;background:#668ca3;animation:form-pulse 1.5s infinite}
.room-status{margin:18px 0 0;padding:11px 13px;border:1px solid #b9945833;border-radius:10px;background:#f4dfb855;color:#78603e;font-size:12px;line-height:1.8;overflow-wrap:anywhere;text-align:left}
.profile-confirm:active:not(:disabled),.room-button:active:not(:disabled){box-shadow:0 1px 0 var(--action-shadow),inset 0 2px 5px #344b5733}
.gender-card:active,.room-name-row:active{box-shadow:inset 0 2px 4px #61795722}
@keyframes form-arrive{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes form-pulse{50%{opacity:.3}}
@media(hover:hover){.profile-cancel:hover,.room-back:hover{background:#42634a0d}.gender-card:hover,.room-name-row:hover{border-color:#668ca3}}
@media(hover:hover){.profile-confirm:hover:not(:disabled),.room-button:hover:not(:disabled){background:var(--action-hover)}}
@container game-viewport (min-width:800px){.room-layout{max-width:1000px;display:grid;grid-template-columns:1fr 420px;align-items:center;gap:70px}.room-intro{padding:20px 0}.room-brand{margin-bottom:70px}.room-intro>.form-eyebrow{display:block;color:var(--muted)}.room-intro>h1{display:block;font-family:inherit;font-size:54px;font-weight:900;color:#fff9e4;text-shadow:0 3px 0 #98a57c,0 5px 0 #688367,0 9px 15px #456f5430;line-height:1.3;letter-spacing:.08em;margin:18px 0 24px}.room-intro>p:not(.form-eyebrow){display:block;font-size:14px;line-height:2;color:var(--ink)}.room-intro-foot{display:block;margin-top:60px;color:var(--muted);font-size:11px;letter-spacing:.15em}.room-panel{padding:32px}}
@container game-viewport (max-height:600px){.profile-panel,.room-panel{padding:20px}.form-emblem{width:36px;height:36px;margin-bottom:8px}.profile-subtitle,.room-subtitle{margin-bottom:16px}.room-brand{margin-bottom:0}.room-intro{padding-bottom:15px}}
@media(prefers-reduced-motion:reduce){.profile-mask *,.room-lobby *{animation:none!important;transition:none!important}}
`;
