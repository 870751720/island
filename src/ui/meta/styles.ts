import { menuActionColors, menuBackdrop, menuSurfaceColors } from '../start/palette';

export const metaPanelCss = `
.meta-panel{${menuActionColors}${menuSurfaceColors}position:fixed;inset:0;z-index:30;display:flex;flex-direction:column;overflow:hidden;overscroll-behavior:none;background:${menuBackdrop};color:var(--ink);font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;padding:calc(6px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right)) calc(6px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left))}
.meta-panel *{box-sizing:border-box}
.meta-panel button{font:inherit;touch-action:manipulation;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .16s,box-shadow .16s,background .2s}
.meta-panel button:focus-visible{outline:3px solid #416b86;outline-offset:3px}
.meta-panel button:active:not(:disabled){transform:translateY(2px) scale(.98)}
.meta-head{width:100%;max-width:960px;margin:0 auto;flex-shrink:0;display:flex;align-items:center;gap:12px}
.meta-back{min-height:44px;padding:0 13px;border:1px solid var(--line);border-radius:24px;background:var(--menu-surface);color:var(--ink);flex-shrink:0}
.meta-head h2{font-family:inherit;font-weight:800;font-size:24px;margin:2px 0;letter-spacing:.08em}
.meta-eyebrow{font-size:10px;line-height:1.7;color:var(--muted);margin:0}
.meta-points{margin-left:auto;display:flex;flex-direction:column;align-items:center;flex-shrink:0}
.meta-points{padding:7px 12px;border:1px solid var(--menu-border);border-radius:15px;background:var(--menu-panel);box-shadow:var(--menu-control-shadow)}
.meta-points strong{font-size:25px;color:#496e87}.meta-points span{font-size:10px;color:var(--muted)}
.meta-content{width:100%;max-width:960px;margin:8px auto 0;flex:1;min-height:0;display:grid;grid-template-rows:minmax(0,1fr) auto;gap:8px}
.meta-map{min-width:0;min-height:0;padding:0 3px;display:flex;flex-direction:column}
.meta-root{position:relative;display:flex;align-items:center;flex-wrap:wrap;justify-content:center;gap:4px 8px;width:210px;margin:0 auto;padding:5px;flex-shrink:0;border:1px solid #fffce7c9;border-radius:20px;background:var(--menu-surface)}
.meta-root{box-shadow:var(--menu-control-shadow)}
.meta-root svg{width:20px;height:20px;color:#668ca3}.meta-root strong{font-size:14px;letter-spacing:.12em}.meta-root span{font-size:10px;color:var(--muted)}
.meta-root:after{content:"";position:absolute;top:100%;height:10px;width:1px;background:#7895a288}
.meta-branches{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding-top:10px;flex:1;min-height:0}
.meta-branch{position:relative;min-width:0;min-height:0;display:grid;grid-template-rows:32px repeat(3,minmax(44px,1fr))}.meta-branch:before{content:"";position:absolute;top:0;left:-5px;right:-5px;border-top:1px solid #7895a288}.meta-branch:first-child:before{left:50%}.meta-branch:last-child:before{right:50%}
.meta-branch h3{position:relative;margin:0;display:flex;align-items:center;justify-content:center;gap:4px;font-size:13px;padding-top:8px;height:32px}.meta-branch h3:before{content:"";position:absolute;top:0;height:6px;left:50%;border-left:1px solid #7895a288}.meta-branch h3 small{font-size:9px;color:var(--muted);font-weight:400}
.meta-path{position:relative;padding-top:8px;min-height:0;display:flex}.meta-path:before{content:"";position:absolute;top:0;height:8px;left:50%;border-left:1px dashed #7895a277}.meta-path.learned:before{border-left:2px solid #668ca3}
.meta-talent{width:100%;min-height:44px;padding:4px 3px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:1px solid var(--line);border-radius:16px;background:var(--menu-panel);color:var(--ink);box-shadow:var(--menu-control-shadow)}
.meta-talent:active{box-shadow:inset 0 2px 4px #61795722}
.meta-talent strong{font-size:13px}.meta-talent small{font-size:10px;color:var(--muted)}.meta-talent.learned{border-color:#668ca399}.meta-talent.learned strong{color:#496e87}.meta-talent.locked{background:var(--menu-surface);color:#718274}.meta-talent.selected{outline:2px solid #496e87;outline-offset:2px;background:var(--menu-selected)}.meta-talent.selected small{color:#496e87}
.meta-ranks{display:flex;gap:5px}.meta-ranks i{width:6px;height:6px;border-radius:50%;background:#aab9ac66}.meta-ranks .on{background:#496e87}
.meta-hint{text-align:center;font-size:10px;color:var(--muted);margin:6px 0 0;flex-shrink:0}
.meta-detail{min-width:0;padding:10px 12px;border:2px solid var(--menu-border);border-radius:24px;background:var(--menu-panel);box-shadow:var(--menu-shadow)}
.meta-detail-title{display:flex;align-items:center;justify-content:space-between;margin:0 0 4px}.meta-detail-title h3{font-family:inherit;font-weight:800;font-size:22px;margin:0;color:#496e87}.meta-detail-title>span{font-size:12px;color:var(--muted)}
.meta-level-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.meta-level-tabs button{min-height:44px;padding:4px 2px;border:1px solid var(--line);border-radius:10px;background:var(--menu-surface);color:var(--muted);font-size:11px}.meta-level-tabs button[aria-pressed="true"]{background:var(--menu-selected);border-color:#668ca399;color:#496e87}
.meta-effect{font-size:12px;line-height:1.5;min-height:36px;margin:6px 0;color:var(--ink)}
.meta-detail>.meta-eyebrow{display:none}
.meta-requirement{font-size:11px;color:var(--muted);line-height:1.6;margin:4px 0 6px}
.meta-buy{width:100%;min-height:44px;border:1px solid var(--action-border);border-radius:13px;background:var(--action-bg);box-shadow:0 4px 0 var(--action-shadow),inset 0 1px 0 #a9c7d4;color:var(--action-text);font-weight:700!important}.meta-buy:disabled{background:var(--menu-disabled);border-color:#c7d1c3;color:#6b7a6d;box-shadow:none;cursor:default}
.meta-buy:active:not(:disabled){box-shadow:0 1px 0 var(--action-shadow),inset 0 2px 5px #344b5733}
.meta-notice{min-height:16px;font-size:10px;line-height:1.6;text-align:center;color:var(--muted);margin:6px 0 0}.meta-footer{max-width:960px;margin:16px auto 0;text-align:center;font-size:10px;line-height:1.8;color:#718274}
@media(hover:hover){.meta-buy:hover:not(:disabled){background:var(--action-hover)}.meta-talent:hover,.meta-level-tabs button:hover{border-color:var(--menu-selection)}}
@media(prefers-reduced-motion:reduce){.meta-panel *{animation:none!important;transition:none!important}}
@media(min-width:700px),(orientation:landscape){.meta-content{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr);align-items:center;gap:20px}.meta-map{height:100%;max-height:520px}.meta-detail{width:100%;max-width:420px;justify-self:center}.meta-head h2{font-size:26px}}
@media(max-height:650px){.meta-points{padding:3px 8px}.meta-head .meta-eyebrow,.meta-footer,.meta-hint{display:none}.meta-notice{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%)}.meta-talent{gap:3px}.meta-content{gap:6px}.meta-root{padding:3px}}
@media(orientation:landscape) and (max-height:450px){.meta-head h2{font-size:21px}.meta-head{height:44px}.meta-root{border:0;padding:0}.meta-root svg{display:none}.meta-content{margin-top:4px}.meta-branch{grid-template-rows:26px repeat(3,minmax(44px,1fr))}.meta-branch h3{height:26px}.meta-talent{display:grid;grid-template-columns:1fr auto;gap:2px 5px;padding:3px 8px}.meta-talent strong{grid-row:span 2}.meta-detail{padding:8px 10px}.meta-effect{margin:4px 0}}
@media(max-width:360px){.meta-head{gap:8px}.meta-head h2{font-size:22px}.meta-branch h3 small{display:none}.meta-branches{gap:8px}}
`;
