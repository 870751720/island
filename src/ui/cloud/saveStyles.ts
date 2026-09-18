import { menuActionColors, menuSurfaceColors } from '../start/palette';

export const saveStyles = `
.cloud-save-icon{width:19px;height:19px;flex-shrink:0}
.cloud-save-choices{display:grid;gap:10px}
.cloud-save-choices button{display:flex;align-items:center;gap:12px;min-height:60px;padding:10px 14px;border:1px solid #89a3ac55;border-radius:14px;background:var(--menu-surface);color:#527386;font:600 14px Arial,"PingFang SC","Microsoft YaHei",sans-serif;text-align:left;cursor:pointer;touch-action:manipulation}
.cloud-save-choices small{display:block;margin-top:5px;font-size:11px;font-weight:400;color:#657761}
.cloud-save-choices button:focus-visible{outline:3px solid #416b86;outline-offset:3px}
.cloud-save-mask{${menuActionColors}${menuSurfaceColors}position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;padding:calc(20px + var(--game-safe-top)) 20px calc(20px + var(--game-safe-bottom));background:#1a322b8f;color:var(--ink);font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif}
.cloud-save-mask *{box-sizing:border-box}
.cloud-save-panel{width:min(100%,360px);max-height:100%;overflow-y:auto;padding:24px 22px;background:var(--menu-panel);border:2px solid var(--menu-border);border-radius:24px;box-shadow:0 20px 60px #122d3d44;text-align:center}
.cloud-save-emblem{display:grid;place-items:center;width:48px;height:48px;margin:0 auto 12px;background:var(--menu-selected);border:1px solid #89a3ac55;border-radius:16px;color:#527386}
.cloud-save-emblem svg{width:27px;height:27px}
.cloud-save-panel h3{margin:0;font-size:22px;color:#49665e}
.cloud-save-subtitle{margin:6px 0 18px;color:#71817a;font-size:10px;letter-spacing:.08em}
.cloud-save-summary{padding:12px 8px;border:1px solid var(--line);border-radius:12px;background:#fffdf077;font-size:12px;line-height:1.7}
.cloud-save-copy{margin:14px 0;font-size:13px;line-height:1.85;overflow-wrap:anywhere}
.cloud-save-warning{color:#916b41}
.cloud-save-actions{display:flex;gap:10px;margin-top:20px}
.cloud-save-actions button{flex:1;min-height:48px;padding:10px 8px;border:1px solid var(--line);border-radius:12px;background:#e9e9d8;color:#41614d;font:600 13px Arial,"PingFang SC","Microsoft YaHei",sans-serif;cursor:pointer;touch-action:manipulation}
.cloud-save-actions button.cloud-save-primary{background:var(--action-bg);border-color:var(--action-border);color:var(--action-text)}
.cloud-save-actions button:disabled{opacity:.5;cursor:wait}
.cloud-save-actions button:focus-visible{outline:3px solid #416b86;outline-offset:3px}
.cloud-save-actions button:active:not(:disabled){transform:translateY(2px)}

.cloud-save-input{display:block;width:100%;min-height:48px;margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:12px;font-size:16px;background:#fffdf0;color:#41614d}
.cloud-save-code{overflow-wrap:anywhere;font-size:14px}
`;
