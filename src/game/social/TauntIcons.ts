import type { TauntGlyph } from '../entities/BearTaunt';

// 手绘矢量路径，与已有黏土色表情一致；不使用系统 emoji 字体或外部图片。
const face = '<circle cx="32" cy="33" r="24" fill="#e9a34f"/><circle cx="32" cy="30" r="23" fill="#ffd17d"/><ellipse cx="23" cy="16" rx="9" ry="4" fill="#ffedbe" transform="rotate(-22 23 16)"/>';
const ink = '<g fill="none" stroke="#593926" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">';
const eyes = '<circle cx="23" cy="28" r="2.5" fill="#593926"/><circle cx="41" cy="28" r="2.5" fill="#593926"/>';
const laughing = face + ink + '<path d="m17 28 7-5 5 5m7 0 5-5 7 5"/></g><path d="M18 35q14 4 28 0c-1 24-27 24-28 0" fill="#71372e"/><path d="M21 37h22l-3 5H24z" fill="#fff6df"/><ellipse cx="32" cy="48" rx="7" ry="3" fill="#e98678"/><path d="M11 31Q1 41 9 43q9-1 2-12m42 0q10 10 2 12-9-1-2-12" fill="#80c6df"/>';
const palm = '<path d="M24 53 14 34q-2-6 3-7l8 12-7-24q-1-6 4-5l9 22-3-25q0-5 5-3l5 26 2-21q2-5 6-1l-1 24 5-12q4-4 6 1l-5 25q-4 14-17 13z" fill="#f1ba73" stroke="#a56e42" stroke-width="2" stroke-linejoin="round"/><path d="m26 43 12-5" stroke="#d59153" stroke-width="2"/>';

export const TAUNT_ICONS: Record<TauntGlyph, string> = {
  look: face + '<ellipse cx="23" cy="29" rx="8" ry="10" fill="#fff9e8"/><ellipse cx="42" cy="29" rx="8" ry="10" fill="#fff9e8"/><ellipse cx="26" cy="30" rx="3" ry="5" fill="#593926"/><ellipse cx="45" cy="30" rx="3" ry="5" fill="#593926"/>' + ink + '<path d="M27 45h10"/></g>',
  question: face + ink + '<path d="M24 22c0-11 21-11 18 1-1 5-10 6-10 12"/></g><circle cx="32" cy="44" r="3" fill="#593926"/>',
  laugh: laughing,
  rofl: '<g transform="rotate(-23 32 32)">' + laughing + '</g>',
  point: '<path d="M18 47V30q0-8 7-8h4V10q0-7 7-6 5 1 5 7v14l8 2q7 2 6 10l-3 15q-1 7-9 7H29q-8-1-11-12" fill="#ffd17d" stroke="#a56e42" stroke-width="2.5"/><path d="M29 27v10m12-10v9M24 41l7 7" fill="none" stroke="#c28b4e" stroke-width="2.5" stroke-linecap="round"/><path d="m8 9 8 6m-9 8h7m34-14-5 6" stroke="#80b9b7" stroke-width="3" stroke-linecap="round"/>',
  bored: face + ink + '<path d="M16 27h12m8 0h12m-29-7 9 2m8 0 9-2"/></g><ellipse cx="32" cy="43" rx="6" ry="8" fill="#71372e"/><path d="M47 7h10l-10 9h10M52 22h8l-8 7h8" fill="none" stroke="#7c9cba" stroke-width="2.5" stroke-linejoin="round"/>',
  clap: '<g transform="translate(-5 5) rotate(-18 32 32) scale(.85)">' + palm + '</g><g transform="translate(14 9) rotate(12 32 32) scale(.8)">' + palm + '</g><path d="m8 10 6 5m11-12 2 7m20-5-3 7m13 3-6 4" stroke="#e6a242" stroke-width="3" stroke-linecap="round"/>',
  facepalm: face + eyes + ink + '<path d="M25 45q7-4 14 0"/></g><g transform="translate(11 5) rotate(-20 32 32) scale(.76)">' + palm + '</g>',
  wave: '<g transform="rotate(-15 32 32)">' + palm + '</g><path d="M9 9Q1 21 6 31m5-15q-4 6-1 11m45 15q5-7 4-14" fill="none" stroke="#80b9b7" stroke-width="3" stroke-linecap="round"/>',
  smirk: face + ink + '<path d="m17 25 11 2m8 0 11-4M22 40q14 10 23-4"/></g>' + eyes,
};
