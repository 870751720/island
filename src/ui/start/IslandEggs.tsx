import { useId } from 'react';
import { DOG_COMBAT_SVG } from '../icons/DogCombatIcons';

export function IslandTentEgg() {
  const clip = useId();
  return <g data-egg="tent" role="button" tabIndex={0} aria-label="轻敲帐篷">
    <defs><clipPath id={clip}><path d="M191 160 207 131 224 161Z" /></clipPath></defs>
    <g clipPath={`url(#${clip})`}><g className="egg-dog">
      <image href={`data:image/svg+xml,${encodeURIComponent(DOG_COMBAT_SVG['dog-companion'])}`} x="192" y="132" width="31" height="31" />
    </g></g>
    <rect className="egg-hit" x="186" y="112" width="59" height="54" />
  </g>;
}

export function IslandSeaEgg() {
  return <g data-egg="sea" role="button" tabIndex={0} aria-label="轻点海面">
    <rect className="egg-hit" x="15" y="210" width="285" height="52" />
    <g className="egg-ripple" fill="none" stroke="#fff9e4" strokeWidth="1.5">
      <ellipse cx="190" cy="224" rx="24" ry="7" /><ellipse cx="190" cy="224" rx="40" ry="12" />
    </g>
  </g>;
}

export function IslandFireEgg() {
  return <g data-egg="fire" role="button" tabIndex={0} aria-label="轻点营火">
    <path className="flame" d="M216 175Q210 166 224 152Q222 162 231 163Q239 176 224 180Z" fill="#eca44e" />
    <path className="flame" d="M220 176Q218 169 225 164Q234 177 224 178Z" fill="#ffe4a0" />
    <g className="egg-spark" fill="#fff0b4"><circle cx="217" cy="162" r="2" /><circle cx="230" cy="156" r="1.8" /><circle cx="223" cy="147" r="1.4" /></g>
    <rect className="egg-hit" x="198" y="165" width="55" height="45" />
  </g>;
}

export function IslandTitleEgg() {
  return <span className="egg-title" role="button" tabIndex={0} aria-label="轻点岛字" data-egg="title">岛
    <svg className="egg-bird" viewBox="0 0 30 25" aria-hidden="true"><path d="M5 20 8 9Q16 2 21 10L25 13 21 15Q15 24 5 20" fill="#fff9e4" /><path d="m23 11 6 3-7 1" fill="#d7a15c" /><circle cx="20" cy="10" r="1.2" fill="#49665e" /><path d="m10 21-1 4m7-4 1 4" stroke="#937655" /></svg>
  </span>;
}
