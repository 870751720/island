import { menuActionColors, menuBackdrop } from '../start/palette';

export const metaPanelCss = `
.meta-panel{${menuActionColors}position:fixed;inset:0;z-index:30;overflow-y:auto;touch-action:pan-y;background:${menuBackdrop};color:#fff2d4;font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;padding:calc(12px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left))}
.meta-panel *{box-sizing:border-box}
.meta-panel button{font:inherit;touch-action:manipulation;cursor:pointer;-webkit-tap-highlight-color:transparent}
.meta-panel button:focus-visible{outline:3px solid #afd8ed;outline-offset:3px}
.meta-head{max-width:960px;margin:auto;display:flex;align-items:center;gap:12px}
.meta-back{min-height:44px;padding:0 13px;border:1px solid #e7efd22b;border-radius:24px;background:#173c454d;color:#f8ebce;flex-shrink:0}
.meta-head h2{font-family:"STKaiti","KaiTi","Songti SC",serif;font-size:28px;margin:2px 0;letter-spacing:.08em}
.meta-eyebrow{font-size:10px;line-height:1.7;color:#d0d9c6;margin:0}
.meta-points{margin-left:auto;display:flex;flex-direction:column;align-items:center;flex-shrink:0}
.meta-points strong{font-size:25px;color:#ffcc88}.meta-points span{font-size:10px;color:#ead8b4}
.meta-content{max-width:960px;margin:20px auto 0;display:grid;gap:18px}
.meta-map{min-width:0;padding:0 3px}
.meta-root{position:relative;display:flex;align-items:center;flex-direction:column;gap:5px;width:150px;margin:auto;padding:10px;border:1px solid #e9d6ab45;border-radius:20px;background:#173c4566}
.meta-root svg{width:26px;height:26px;color:#edcd96}.meta-root strong{font-size:14px;letter-spacing:.12em}.meta-root span{font-size:10px;color:#bdd0c4}
.meta-root:after{content:"";position:absolute;top:100%;height:20px;width:1px;background:#e9d6ab55}
.meta-branches{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding-top:20px}
.meta-branch{position:relative;min-width:0}.meta-branch:before{content:"";position:absolute;top:0;left:-5px;right:-5px;border-top:1px solid #e9d6ab55}.meta-branch:first-child:before{left:50%}.meta-branch:last-child:before{right:50%}
.meta-branch h3{position:relative;margin:0;display:flex;align-items:center;justify-content:center;gap:4px;font-size:13px;padding-top:18px;height:52px}.meta-branch h3:before{content:"";position:absolute;top:0;height:14px;left:50%;border-left:1px solid #e9d6ab55}.meta-branch h3 small{font-size:9px;color:#bdd0c4;font-weight:400}
.meta-path{position:relative;padding-top:18px}.meta-path:before{content:"";position:absolute;top:0;height:18px;left:50%;border-left:1px dashed #9cb7aa77}.meta-path.learned:before{border-left:2px solid #edcd96}
.meta-talent{width:100%;min-height:80px;padding:9px 3px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border:1px solid #e2edcc36;border-radius:16px;background:#204e50a6;color:#f6edd4;box-shadow:0 5px 16px #06272d20}
.meta-talent strong{font-size:13px}.meta-talent small{font-size:10px;color:#bdd0c4}.meta-talent.learned{border-color:#edcd9677}.meta-talent.learned strong{color:#ffcc88}.meta-talent.locked{background:#173c454d;color:#a3bdb5}.meta-talent.selected{outline:2px solid #ffcc88;outline-offset:2px;background:#436e6870}.meta-talent.selected small{color:#ffdfaf}
.meta-ranks{display:flex;gap:5px}.meta-ranks i{width:6px;height:6px;border-radius:50%;background:#9cb7aa40}.meta-ranks .on{background:#ffcc88}
.meta-hint{text-align:center;font-size:10px;color:#bdd0c4;margin:16px 0 0}
.meta-detail{min-width:0;padding:18px;border:1px solid #d9e5cf26;border-radius:24px;background:linear-gradient(145deg,#436e684a,#123b4366);box-shadow:0 18px 48px #06272d24,inset 0 1px 0 #fff5da0a}
.meta-detail-title{display:flex;align-items:center;justify-content:space-between;margin:9px 0 14px}.meta-detail-title h3{font-family:"STKaiti","KaiTi","Songti SC",serif;font-size:26px;margin:0;color:#ffcc88}.meta-detail-title>span{font-size:12px;color:#ead8b4}
.meta-effects{padding:0;margin:0;list-style:none;display:flex;flex-direction:column;gap:12px}.meta-effects li{display:flex;gap:10px;align-items:flex-start;font-size:12px;line-height:1.6;color:#a3bdb5}.meta-effects li>span{display:grid;place-items:center;flex-shrink:0;width:24px;height:24px;border:1px solid #d9e5cf26;border-radius:8px}.meta-effects small{display:block;font-size:9px;margin-bottom:2px}.meta-effects .learned{color:#edcd96}.meta-effects .next{color:#fff2d4}.meta-effects .learned>span{background:#edcd961a;border-color:#edcd9677}
.meta-requirement{font-size:11px;color:#ead8b4;line-height:1.6;margin:16px 0 10px}
.meta-buy{width:100%;min-height:48px;border:1px solid var(--action-border);border-radius:13px;background:var(--action-bg);box-shadow:0 4px 0 var(--action-shadow),inset 0 1px 0 #a9c7d4;color:var(--action-text);font-weight:700!important}.meta-buy:disabled{background:#173c4566;border-color:#d9e5cf26;color:#a3bdb5;box-shadow:none;cursor:default}
.meta-notice{min-height:16px;font-size:10px;line-height:1.6;text-align:center;color:#bdd0c4;margin:12px 0 0}.meta-footer{max-width:960px;margin:16px auto 0;text-align:center;font-size:10px;line-height:1.8;color:#a3bdb5}
@media(min-width:700px){.meta-content{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:start;gap:28px}.meta-detail{margin-top:20px}.meta-head h2{font-size:34px}.meta-talent{min-height:88px}}
@media(max-width:360px){.meta-head{gap:8px}.meta-head h2{font-size:24px}.meta-head .meta-eyebrow{font-size:9px}.meta-branch h3 small{display:none}.meta-branches{gap:8px}}
`;
