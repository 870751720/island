import { useId } from 'react';
import { IslandDogHead } from './IslandDogHead';
import { IslandCatHead } from './IslandCatHead';

export function IslandTentEgg() {
  const clip = useId();
  return <g data-egg="tent" role="button" tabIndex={0} aria-label="轻敲帐篷">
    <defs><clipPath id={clip}><rect x="188" y="125" width="40" height="37" /></clipPath></defs>
    <g clipPath={`url(#${clip})`}><g className="egg-companion" opacity="0" visibility="hidden">
      <g data-companion="dog" display="none"><IslandDogHead /></g>
      <g data-companion="cat" display="none"><IslandCatHead /></g>
    </g></g>
    <path className="egg-hit" fill="none" pointerEvents="all" d="M176 160 205 116 259 135 270 166 242 159Z" />
  </g>;
}

export function IslandSeaEgg() {
  return <g data-egg="sea" role="button" tabIndex={0} aria-label="轻点海面">
    <rect className="egg-hit" fill="none" pointerEvents="all" x="0" y="110" width="380" height="135" />
    <g className="egg-ripple-position" transform="translate(190 224)" pointerEvents="none"><g className="egg-ripple" opacity="0" visibility="hidden" fill="none" stroke="#fff9e4" strokeWidth="1.5">
      <ellipse rx="24" ry="7" /><ellipse rx="40" ry="12" />
    </g></g>
  </g>;
}

export function IslandFireEgg({ interactive = false }: { interactive?: boolean }) {
  return <g data-egg={interactive ? 'fire' : undefined} role={interactive ? 'button' : undefined} tabIndex={interactive ? 0 : undefined} aria-label={interactive ? '轻点营火' : undefined}>
    <path className="flame" d="M216 175Q210 166 224 152Q222 162 231 163Q239 176 224 180Z" fill="#eca44e" />
    <path className="flame" d="M220 176Q218 169 225 164Q234 177 224 178Z" fill="#ffe4a0" />
    {interactive && <><g className="egg-spark" opacity="0" visibility="hidden" fill="#fff0b4"><circle cx="217" cy="162" r="2" /><circle cx="230" cy="156" r="1.8" /><circle cx="223" cy="147" r="1.4" /></g>
    <rect className="egg-hit" fill="none" pointerEvents="all" x="198" y="165" width="55" height="45" /></>}
  </g>;
}

export function IslandTitleEgg() {
  return <span className="egg-title" role="button" tabIndex={0} aria-label="轻点岛字" data-egg="title">岛
    <svg className="egg-bird" width="28" height="25" opacity="0" visibility="hidden" style={{ position: 'absolute', top: -17, right: 2, pointerEvents: 'none' }} viewBox="0 0 30 25" aria-hidden="true"><path d="M5 20 8 9Q16 2 21 10L25 13 21 15Q15 24 5 20" fill="#fff9e4" /><path d="m23 11 6 3-7 1" fill="#d7a15c" /><circle cx="20" cy="10" r="1.2" fill="#49665e" /><path d="m10 21-1 4m7-4 1 4" stroke="#937655" /></svg>
  </span>;
}
