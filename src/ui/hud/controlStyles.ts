/** 背包、工具、设置和地图按钮的独立样式。 */
export const hudControlStyles = `
.hud-control{box-sizing:border-box;color:#49665e;font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-tap-highlight-color:transparent}
.hud-control{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;position:relative;padding:0;border:1px solid #fff8e9bb;background:linear-gradient(145deg,#fff9e4e8,#dce8d6cc);box-shadow:0 3px 9px #314c3e24,inset 0 1px 0 #ffffffcc;cursor:pointer;touch-action:manipulation;user-select:none;transition:opacity .5s ease,transform .18s ease,background .18s ease,box-shadow .18s ease!important}
.hud-control:active:not(:disabled){transform:scale(.92);box-shadow:0 1px 4px #081c3440,inset 0 2px 7px #0003}
.hud-control:focus-visible,.hud-status button:focus-visible{outline:2px solid #609e91;outline-offset:3px}
.hud-control:disabled{cursor:default}
.hud-control-label{font-size:10px;font-weight:600;letter-spacing:.08em;line-height:14px;max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hud-utility{width:46px;height:46px;border-radius:15px;flex-shrink:0}
.hud-settings>svg{transition:transform .25s ease}
.hud-settings:active>svg{transform:rotate(35deg)}
.hud-backpack,.hud-tool{position:absolute;right:max(16px,env(safe-area-inset-right));width:72px;height:72px;border-radius:23px}
.hud-backpack{top:calc(50% - 120px)}
.hud-backpack>svg{color:#493f32;transition:transform .18s ease}
.hud-backpack:active>svg{transform:translateY(-2px) rotate(-7deg)}
.hud-backpack[aria-expanded=true]{border-color:#cba86c;background:linear-gradient(145deg,#fff0c8,#d5e6c9)}
.hud-tool{top:calc(50% - 36px);touch-action:none}
.hud-tool.is-context{border-color:#d6ac64;background:linear-gradient(145deg,#fff1c9ed,#e8d9b9ed)}
.hud-tool-visual{display:flex;align-items:center;justify-content:center;animation:hud-icon-in .2s ease-out}
.hud-tool-hint{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;font-size:9px;letter-spacing:.05em;background:#fff6dfd9;padding:3px 7px;border-radius:8px;color:#53665b;pointer-events:none}
.hud-tool-cue{position:absolute;inset:-4px;border:1px solid #efce8b;border-radius:27px;pointer-events:none;animation:hud-context-cue 1.5s ease-out 3 both}
.hud-hold-ring{position:absolute;inset:-5px;width:82px;height:82px;pointer-events:none;transform:rotate(-90deg);color:#b78039}
.hud-hold-ring rect{fill:none;stroke:currentColor;stroke-width:2.5;stroke-dasharray:100;stroke-dashoffset:100;animation:hud-hold .35s linear forwards}
.hud-tool-count{position:absolute;right:-5px;top:-5px;min-width:21px;padding:2px 5px;border:1px solid #fff4d6;border-radius:8px;background:#f5e7c9;color:#536454;font-size:11px;font-weight:700;line-height:16px;font-variant-numeric:tabular-nums}
`;
