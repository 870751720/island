/** 菜单插画动效，统一前缀并支持减少动态效果。 */
export const islandSceneCss = `
.menu-island .fishing-scene{pointer-events:none}
.menu-island .fishing-scene *{transform-box:view-box}
.menu-island .fisher-body{transform-origin:0 3px;animation:menu-fisher-body 12s ease-in-out infinite}
.menu-island .fisher-head{transform-origin:0 -14px;animation:menu-fisher-head 12s ease-in-out infinite}
.menu-island .fishing-rod{transform-origin:0 0;animation:menu-fishing-rod 12s ease-in-out infinite}
.menu-island .fishing-line{animation:menu-fishing-line 12s ease-in-out infinite}
.menu-island .fishing-bobber{animation:menu-fishing-bobber 12s ease-in-out infinite}
.menu-island .fishing-ripples{fill:none;stroke:#f4f7dc;stroke-width:1;opacity:.65}
.menu-island .ripple-pulse{animation:menu-fishing-ripple 3s ease-out infinite}
.menu-island .caught-fish{opacity:0;animation:menu-fishing-catch 12s ease-in-out infinite}
.menu-island .catch-line{opacity:0;animation:menu-catch-line 12s ease-in-out infinite}
.menu-island .fishing-splash{opacity:0;animation:menu-fishing-splash 12s ease-out infinite}
@keyframes menu-fisher-body{0%,8%,53%,100%{transform:rotate(0)}5%{transform:rotate(-8deg)}58%,62%{transform:rotate(4deg)}70%,79%{transform:rotate(-9deg)}87%{transform:rotate(0)}}
@keyframes menu-fisher-head{0%,12%,50%,100%{transform:rotate(0)}34%,57%{transform:rotate(5deg)}70%,80%{transform:rotate(-7deg)}}
@keyframes menu-fishing-rod{0%,12%,50%,100%{transform:rotate(0)}4%{transform:rotate(-45deg)}8%{transform:rotate(8deg)}55%{transform:rotate(3deg)}58%{transform:rotate(8deg)}61%{transform:rotate(3deg)}64%{transform:rotate(9deg)}71%,79%{transform:rotate(-48deg)}89%{transform:rotate(-10deg)}}
@keyframes menu-fishing-line{0%,12%,55%,100%{opacity:.85}3%,8%{opacity:0}58%,64%{opacity:.9}69%,89%{opacity:0}96%{opacity:.85}}
@keyframes menu-fishing-bobber{0%,12%,50%,100%{opacity:1;transform:translateY(0)}2%,10%{opacity:0}25%,43%{transform:translateY(1.5px)}56%{transform:translateY(3px)}59%{transform:translateY(-1px)}63%{opacity:1;transform:translateY(4px)}67%,94%{opacity:0;transform:translateY(0)}}
@keyframes menu-fishing-ripple{0%{opacity:.15;transform:scale(.6)}35%{opacity:.65}100%{opacity:0;transform:scale(1.2)}}
@keyframes menu-fishing-catch{0%,64%{opacity:0;transform:translate(0,0) rotate(0)}66%{opacity:1;transform:translate(-2px,-9px) rotate(-25deg)}73%{opacity:1;transform:translate(-25px,-65px) rotate(-70deg)}78%{opacity:1;transform:translate(-45px,-67px) rotate(-35deg)}82%{opacity:1;transform:translate(-53px,-33px) rotate(-110deg)}86%,100%{opacity:0;transform:translate(-56px,-24px) rotate(-100deg)}}
@keyframes menu-fishing-splash{0%,10%,17%,63%,72%,100%{opacity:0;transform:scale(.6)}12%,66%{opacity:.9;transform:scale(1)}16%,71%{opacity:0;transform:scale(1.6)}}
@keyframes menu-catch-line{0%,64%,86%,100%{opacity:0}66%{opacity:.8;d:path('M317 145Q330 175 333 204')}73%{opacity:.8;d:path('M287 130Q303 130 310 148')}78%{opacity:.8;d:path('M287 130Q292 132 290 146')}82%{opacity:.8;d:path('M292 130Q289 157 282 180')}}

.menu-island{display:block;width:100%;height:236px;margin:-4px auto -3px;overflow:visible;pointer-events:none}
.menu-island .wave{transform-origin:190px 184px;animation:menu-water 6s ease-in-out infinite}
.menu-island .wave.second{animation-delay:-3s}
.menu-island .birds{animation:menu-seabirds 12s ease-in-out infinite}
.menu-island .flame{transform-origin:223px 176px;animation:menu-fire 1.1s ease-in-out infinite}
@keyframes menu-water{50%{transform:scale(1.05);opacity:.35}}
@keyframes menu-seabirds{50%{transform:translate(12px,-4px)}}
@keyframes menu-fire{50%{transform:scale(.85,1.13)}}
.menu-island[data-paused=true] *{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){.menu-island *{animation:none!important;transition:none!important}.menu-island .fishing-splash,.menu-island .caught-fish,.menu-island .catch-line{opacity:0}}
`;
