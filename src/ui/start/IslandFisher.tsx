/** 本地装饰性垂钓，CSS 时间轴与游戏的钓鱼结算互不关联。 */
export function IslandFisher() {
  return (
    <g className="fishing-scene">
      <g className="fishing-ripples" transform="translate(335 213)">
        <g className="ripple-pulse">
          <ellipse rx="13" ry="4" />
          <ellipse rx="20" ry="6" />
        </g>
      </g>
      <g transform="translate(280 184)">
        <ellipse cx="1" cy="8" rx="12" ry="4" fill="#3b634d" opacity=".22" />
        <path d="M-5 2-6 9m10-7 1 8" stroke="#66583e" strokeWidth="4.5" strokeLinecap="round" />
        <g className="fisher-body">
          <path d="M-8-10-7 2 6 3 7-9Z" fill="#eee7c9" />
          <path d="M-8-10-7 2-2 3-2-11Z" fill="#c4d2af" />
          <path d="M-5-8-3 2m7-10-1 11" stroke="#819774" strokeWidth="2" />
          <g className="fisher-head">
            <circle cx="0" cy="-18" r="7" fill="#e4ba8e" />
            <path d="M-7-19-5-25 4-26 7-21 3-22Z" fill="#675a43" />
            <ellipse cx="0" cy="-24" rx="12" ry="3" fill="#e2c37c" />
            <path d="M-7-25-4-31 4-31 7-25Z" fill="#f0d995" />
            <path d="M-6-25H6" stroke="#b39053" strokeWidth="2" />
            <circle cx="5" cy="-18" r=".9" fill="#5a5240" />
          </g>
          <path d="M-7-7-2-3 7-6" fill="none" stroke="#e2b58a" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g transform="translate(7 -7)">
          <g className="fishing-rod">
            <path d="M0 0Q14-21 35-32" fill="none" stroke="#806343" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M8-12Q19-25 35-32" fill="none" stroke="#c5a469" strokeWidth="1.4" />
            <path className="fishing-line" d="M35-32Q53-4 48 36" fill="none" stroke="#faf4de" strokeWidth=".8" opacity=".85" />
            <circle cx="3" cy="-3" r="2.7" fill="#a0b4a3" stroke="#5a7367" strokeWidth="1" />
          </g>
        </g>
      </g>
      <path className="catch-line" d="M317 145Q330 175 333 204" fill="none" stroke="#faf4de" strokeWidth=".8" />
      <g transform="translate(335 213)">
        <g className="fishing-bobber">
          <path d="M0-8V2" stroke="#685c42" strokeWidth="1" />
          <ellipse cy="-2" rx="2" ry="4" fill="#f3efcf" />
          <path d="M-2-3Q0-7 2-3V-1H-2Z" fill="#ce8054" />
        </g>
        <g className="fishing-splash" fill="none" stroke="#f8f7de" strokeWidth="1.5" strokeLinecap="round">
          <path d="M-4-3-9-9M1-5 2-13M6-2 13-7" />
          <ellipse rx="10" ry="3" />
        </g>
        <g className="caught-fish">
          <path d="M-9 0Q-1-8 9 0 0 8-9 0L-14-5V5Z" fill="#d9e8cf" />
          <path d="M-9 0Q-1-8 9 0H-9Z" fill="#83aaa1" />
          <circle cx="5" cy="-1" r="1" fill="#41665f" />
          <path d="m-1-4 2-3 3 4" fill="#99b8a2" />
        </g>
      </g>
    </g>
  );
}
