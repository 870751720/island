/** 自绘表情图标:每个表情一份 SVG 内部标记(viewBox 0 0 64 64)。
 * 选择面板(React)与头顶气泡(DOM SVG)共用同一份标记,两端表现一致。
 * 字形(Unicode emoji)仍作为联机线上 ID 与白名单键不变,图标只是表现层映射;
 * 风格与游戏内道具图标一致:平涂黏土、柔和双色、小白高光。 */

const LOVE = (
  '<ellipse cx="32" cy="59" rx="11.5" ry="2.5" fill="#4a3221" opacity=".12"/>' +
  '<circle cx="32" cy="33" r="21" fill="#ffcf7d"/>' +
  '<path d="M14.5 38.5a21 21 0 0 0 35 0c-2.6 6.4-9.2 10.8-17.5 10.8S17.1 44.9 14.5 38.5z" fill="#eba04f" opacity=".4"/>' +
  '<ellipse cx="24" cy="24" rx="8.2" ry="4.6" fill="#ffe9b8" opacity=".85" transform="rotate(-28 24 24)"/>' +
  '<path d="M19.5 33.6C20.1 30.4 23.37 29.6 23.8 29.6S27.3 30.4 28.1 33.6" fill="none" stroke="#53381f" stroke-width="2.4" stroke-linecap="round"/>' +
  '<path d="M36 33.6C36.6 30.4 39.87 29.6 40.3 29.6S43.8 30.4 44.6 33.6" fill="none" stroke="#53381f" stroke-width="2.4" stroke-linecap="round"/>' +
  '<path d="M25.5 40.5q6.5 9 13 0z" fill="#7a3327"/>' +
  '<path d="M27.5 41.2h9.2q-4.6 3.2-9.2 0z" fill="#fff" opacity=".95"/>' +
  '<circle cx="20.5" cy="39" r="4.4" fill="#f28d6e" opacity=".65"/>' +
  '<circle cx="43.5" cy="39" r="4.4" fill="#f28d6e" opacity=".65"/>' +
  '<path transform="translate(46 12) scale(2.1)" d="M3 5.7C2.6 5.7.3 3.9.3 2.4.3 1.2 1.1.3 2.1.3c.4 0 .8.2 1 .5.2-.3.5-.5.9-.5 1 0 1.9.9 1.9 2.1 0 1.5-2.3 3.3-2.9 3.3z" fill="#e0524f"/>' +
  '<circle cx="48.31" cy="14.94" r="1.16" fill="#fff" opacity=".9"/>' +
  '<path transform="translate(50 25) scale(1.1)" d="M3 5.7C2.6 5.7.3 3.9.3 2.4.3 1.2 1.1.3 2.1.3c.4 0 .8.2 1 .5.2-.3.5-.5.9-.5 1 0 1.9.9 1.9 2.1 0 1.5-2.3 3.3-2.9 3.3z" fill="#e0524f"/>' +
  '<circle cx="51.21" cy="26.54" r="0.61" fill="#fff" opacity=".9"/>' +
  '<path transform="translate(41 6) scale(0.9)" d="M3 5.7C2.6 5.7.3 3.9.3 2.4.3 1.2 1.1.3 2.1.3c.4 0 .8.2 1 .5.2-.3.5-.5.9-.5 1 0 1.9.9 1.9 2.1 0 1.5-2.3 3.3-2.9 3.3z" fill="#e0524f"/>' +
  '<circle cx="41.99" cy="7.26" r="0.5" fill="#fff" opacity=".9"/>'
);

const CRY = (
  '<ellipse cx="32" cy="59" rx="11.5" ry="2.5" fill="#4a3221" opacity=".12"/>' +
  '<circle cx="32" cy="33" r="21" fill="#ffd489"/>' +
  '<ellipse cx="24.5" cy="24.5" rx="8" ry="4.6" fill="#ffe9b8" opacity=".8" transform="rotate(-28 24.5 24.5)"/>' +
  '<path d="M19.5 34.1C20.1 30.9 23.28 30.1 23.7 30.1S27.3 30.9 27.9 34.1" fill="none" stroke="#53381f" stroke-width="2.4" stroke-linecap="round"/>' +
  '<path d="M36 34.1C36.6 30.9 39.78 30.1 40.2 30.1S43.8 30.9 44.4 34.1" fill="none" stroke="#53381f" stroke-width="2.4" stroke-linecap="round"/>' +
  '<rect x="20.8" y="36.5" width="4.6" height="13" rx="2.3" fill="#7ec3e8" transform="rotate(7 23 43)"/>' +
  '<rect x="38.6" y="36.5" width="4.6" height="13" rx="2.3" fill="#7ec3e8" transform="rotate(-7 41 43)"/>' +
  '<path d="M25 45.5q1.6-2.4 3.2 0t3.2 0 3.2 0 3.2 0 3.2 0" fill="none" stroke="#53381f" stroke-width="2.4" stroke-linecap="round"/>' +
  '<path d="M17 27.5q4-2.6 8-1" fill="none" stroke="#53381f" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
  '<path d="M39 26.5q4-1.6 8 1" fill="none" stroke="#53381f" stroke-width="2" stroke-linecap="round" opacity=".7"/>'
);

const ANGRY = (
  '<ellipse cx="32" cy="59" rx="11.5" ry="2.5" fill="#4a3221" opacity=".12"/>' +
  '<circle cx="32" cy="33" r="21" fill="#ffcf7d"/>' +
  '<path d="M14.5 38.5a21 21 0 0 0 35 0c-2.6 6.4-9.2 10.8-17.5 10.8S17.1 44.9 14.5 38.5z" fill="#eba04f" opacity=".4"/>' +
  '<ellipse cx="24" cy="24" rx="8.2" ry="4.6" fill="#ffe9b8" opacity=".85" transform="rotate(-28 24 24)"/>' +
  '<g stroke="#e0524f" stroke-width="2.3" stroke-linecap="round" fill="none">' +
  '<path d="M43 13.5l4.6 4.6M47.6 13.5l-4.6 4.6M47 11.4l-1.6 1.4M41.6 15.4l1.4 1.6M49.6 16.4l-1.4 1.6"/>' +
  '</g>' +
  '<path d="M17.5 27l9 3.2M46.5 27l-9 3.2" fill="none" stroke="#53381f" stroke-width="2.5" stroke-linecap="round"/>' +
  '<circle cx="24" cy="34" r="2.3" fill="#4a3221"/>' +
  '<circle cx="40" cy="34" r="2.3" fill="#4a3221"/>' +
  '<circle cx="20.5" cy="39" r="4.4" fill="#f28d6e" opacity=".65"/>' +
  '<circle cx="43.5" cy="39" r="4.4" fill="#f28d6e" opacity=".65"/>' +
  '<path d="M25.5 44l3-2.2 3 2.2 3-2.2 3 2.2 3-2.2" fill="none" stroke="#53381f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
);

const SCARE = (
  '<ellipse cx="32" cy="59" rx="11.5" ry="2.5" fill="#4a3221" opacity=".12"/>' +
  '<circle cx="32" cy="33" r="21" fill="#ffd489"/>' +
  '<ellipse cx="24.5" cy="24.5" rx="8" ry="4.6" fill="#ffe9b8" opacity=".8" transform="rotate(-28 24.5 24.5)"/>' +
  '<circle cx="23.5" cy="31" r="5.6" fill="#fff" opacity=".97"/>' +
  '<circle cx="22.9" cy="31.4" r="1.7" fill="#4a3221"/>' +
  '<circle cx="40.5" cy="31" r="5.6" fill="#fff" opacity=".97"/>' +
  '<circle cx="41.1" cy="31.4" r="1.7" fill="#4a3221"/>' +
  '<ellipse cx="32" cy="44" rx="4" ry="5.2" fill="#7a3327"/>' +
  '<path transform="translate(45.5 16) scale(1.15)" d="M3 0C4.4 2.3 5.8 4 5.8 5.5A2.9 2.9 0 1 1 0 5.5C0 4 1.6 2.3 3 0Z" fill="#7ec3e8"/>' +
  '<circle cx="47.69" cy="21.29" r="0.58" fill="#fff" opacity=".85"/>'
);

export const EMOJI_ICONS: Readonly<Record<string, string>> = {
  '😍': LOVE,
  '😭': CRY,
  '😡': ANGRY,
  '😱': SCARE,
};
