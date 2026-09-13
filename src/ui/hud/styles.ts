/** 局部 HUD 表现：轻量渐变与 transform/opacity 动效，不使用背景模糊。 */
export const hudStyles = `
.hud-control,.hud-status{box-sizing:border-box;color:#f8efd9;font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-tap-highlight-color:transparent}
.hud-control{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;position:relative;padding:0;border:1px solid #dce8dc52;background:linear-gradient(145deg,#335654ed,#172f36eb);box-shadow:0 4px 12px #081c3430,inset 0 1px 0 #fff4d51f;cursor:pointer;touch-action:manipulation;user-select:none;transition:opacity .5s ease,transform .18s ease,background .18s ease,box-shadow .18s ease!important}
.hud-control:after{content:"";position:absolute;inset:3px;border:1px solid #f9ecc20d;border-radius:inherit;pointer-events:none}
.hud-control:active:not(:disabled){transform:scale(.92);box-shadow:0 1px 4px #081c3440,inset 0 2px 7px #0003}
.hud-control:focus-visible,.hud-status button:focus-visible{outline:2px solid #f4d398;outline-offset:3px}
.hud-control:disabled{cursor:default}
.hud-control-label{font-size:10px;font-weight:600;letter-spacing:.08em;line-height:14px;max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hud-utility{width:46px;height:46px;border-radius:15px;flex-shrink:0}
.hud-settings>svg{transition:transform .25s ease}
.hud-settings:active>svg{transform:rotate(35deg)}
.hud-backpack,.hud-tool{position:absolute;right:max(16px,env(safe-area-inset-right));width:72px;height:72px;border-radius:23px}
.hud-backpack{top:calc(50% - 120px)}
.hud-backpack>svg{color:#493f32;transition:transform .18s ease}
.hud-backpack:active>svg{transform:translateY(-2px) rotate(-7deg)}
.hud-backpack[aria-expanded=true]{border-color:#f0cd89;background:linear-gradient(145deg,#526a58,#2b4747)}
.hud-tool{top:calc(50% - 36px);touch-action:none}
.hud-tool.is-context{border-color:#edcd8d;background:linear-gradient(145deg,#6a6549ed,#344b43f2)}
.hud-tool-visual{display:flex;align-items:center;justify-content:center;animation:hud-icon-in .2s ease-out}
.hud-tool-hint{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;font-size:9px;letter-spacing:.05em;background:#19343bd9;padding:3px 7px;border-radius:8px;color:#eee4cf;pointer-events:none}
.hud-tool-cue{position:absolute;inset:-4px;border:1px solid #efce8b;border-radius:27px;pointer-events:none;animation:hud-context-cue 1.5s ease-out 3 both}
.hud-hold-ring{position:absolute;inset:-5px;width:82px;height:82px;pointer-events:none;transform:rotate(-90deg);color:#ffe0a0}
.hud-hold-ring rect{fill:none;stroke:currentColor;stroke-width:2.5;stroke-dasharray:100;stroke-dashoffset:100;animation:hud-hold .35s linear forwards}
.hud-tool-count{position:absolute;right:-5px;top:-5px;min-width:21px;padding:2px 5px;border:1px solid #d4e5da66;border-radius:8px;background:#213e46;color:#fff3d5;font-size:11px;font-weight:700;line-height:16px;font-variant-numeric:tabular-nums}
.hud-status{position:absolute;top:max(10px,env(safe-area-inset-top));left:max(10px,env(safe-area-inset-left));display:flex;flex-direction:column;align-items:flex-start;gap:7px;width:174px;max-width:calc(100vw - max(10px,env(safe-area-inset-left)) - max(10px,env(safe-area-inset-right)) - var(--hud-right-reserve));pointer-events:none}
.hud-status-card{width:100%;padding:10px 10px 9px;border:1px solid #e0ebd93b;border-radius:18px;background:linear-gradient(135deg,#263f43eb,#162d35e0);box-shadow:0 4px 16px #081c3426,inset 0 1px 0 #ffedc812}
.hud-day{display:flex;justify-content:space-between;align-items:center;gap:4px;padding:0 1px 7px;border-bottom:1px solid #dbe7d51c;font-size:10px;white-space:nowrap;color:#eddfc2}
.hud-day strong{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.hud-season{font-size:9px;color:#c7dac8;display:flex;align-items:center;gap:4px}
.hud-season:before{content:"";width:5px;height:5px;border-radius:50%;background:var(--season-color)}
.hud-vital{--vital-color:#e88d85;display:flex;align-items:center;gap:6px;min-height:33px}
.hud-vital--health{min-height:44px}
.hud-vital--hunger{--vital-color:#e6ba72}
.hud-vital--thirst{--vital-color:#7fcbdc}
.hud-vital-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:22px;color:var(--vital-color)}
button.hud-vital-icon{width:44px;height:44px;margin-left:-10px;margin-right:-12px;padding:0;background:none;border:0;pointer-events:auto;cursor:pointer;touch-action:manipulation;border-radius:10px}
.hud-vital-body{flex:1;min-width:0}
.hud-vital-caption{display:flex;justify-content:space-between;gap:4px;font-size:9px;line-height:13px;margin-bottom:4px;color:#dbe4d9}
.hud-vital-warning{color:#ffd49c;font-size:8px}
.hud-meter{position:relative;height:6px;background:#071e2c99;border-radius:4px;overflow:hidden;box-shadow:inset 0 1px 2px #0003}
.hud-vital--health .hud-meter{height:8px}
.hud-meter-fill,.hud-meter-trail{position:absolute;inset:0;border-radius:inherit;transform-origin:left;transition:transform .4s ease-out;background:var(--vital-color)}
.hud-meter-fill{background:linear-gradient(0deg,#00000010,#ffffff24),var(--vital-color)}
.hud-meter-trail{background:#ffefd0;opacity:.65;transition:transform .85s .1s ease-out}
.hud-meter-ticks{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(25% - 1px),#122e3d55 calc(25% - 1px),#122e3d55 25%)}
.hud-vital.is-low .hud-vital-icon{animation:hud-low 1.8s ease-in-out infinite}
.hud-buffs{display:flex;flex-wrap:wrap;gap:5px;max-width:100%;pointer-events:auto}
.hud-buff{position:relative;width:44px;height:44px;padding:0;display:flex;align-items:center;justify-content:center;border:1px solid #9dcca766;border-radius:13px;background:#213f42ed;color:#fff3d5;cursor:pointer;font-size:19px;touch-action:manipulation;box-shadow:0 3px 9px #081c3424}
.hud-buff.is-bad{border-color:#ed998a99}
.hud-buff:active{transform:scale(.92)}
.hud-buff-time{position:absolute;right:2px;bottom:1px;background:#1c333c;font-size:9px;line-height:12px;padding:0 3px;border-radius:4px;font-variant-numeric:tabular-nums}
.hud-panel-enter{animation:hud-panel-in .2s ease-out}
@keyframes hud-panel-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes hud-icon-in{from{opacity:.4;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
@keyframes hud-hold{to{stroke-dashoffset:0}}
@keyframes hud-context-cue{from{opacity:.8;transform:scale(.98)}to{opacity:0;transform:scale(1.14)}}
@keyframes hud-low{50%{opacity:.5}}
@media(hover:hover){.hud-control:hover:not(:disabled){background:linear-gradient(145deg,#466b65f2,#263f47f2)}}
@media(orientation:landscape) and (max-height:500px){.hud-backpack,.hud-tool{top:auto;bottom:max(30px,env(safe-area-inset-bottom))}.hud-backpack{right:calc(max(16px,env(safe-area-inset-right)) + 86px)}}
@media(prefers-reduced-motion:reduce){.hud-control,.hud-control *,.hud-status *,.hud-panel-enter{animation:none!important;transition:none!important}.hud-hold-ring rect{stroke-dashoffset:0}}
`;
