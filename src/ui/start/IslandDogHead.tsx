/** 帐篷里的薯条：直接使用场景坐标绘制黑色蓬松头部。 */
export function IslandDogHead() {
  return <g strokeLinejoin="round" transform="translate(207 160) scale(.5) translate(-207 -160)">
    <path d="M195 143 194 131 203 137 212 137 220 131 219 146Z" fill="#292a32" />
    <path d="m197 136 1 7 4-3m11 0 4-4-1 8" fill="#67505b" />
    <path d="m192 145 3-3-1-4 6 1 3-3 4 2 5-2 3 4 5-1-1 5 4 3-3 3 1 4-5 1-2 4-5-1-4 2-4-3-5 1-1-4-4-2Z" fill="#303139" />
    <path d="m193 146 5-4 2 2-2 4-3 2Zm20-4 5 2 2 5-4-1Z" fill="#41424a" />
    <ellipse cx="201" cy="146" rx="2.3" ry="2.6" fill="#101117" />
    <ellipse cx="213" cy="146" rx="2.3" ry="2.6" fill="#101117" />
    <circle cx="200.4" cy="145" r=".8" fill="#fff9e4" />
    <circle cx="212.4" cy="145" r=".8" fill="#fff9e4" />
    <ellipse cx="207" cy="151" rx="5" ry="3.5" fill="#3e3e45" />
    <path d="M204 149Q207 147 210 149L207 152Z" fill="#12131a" />
    <path d="M203 153Q207 156 211 153" fill="none" stroke="#14151a" strokeWidth="1.2" />
    <path d="M205 154Q207 153 209 154L209 157Q207 160 205 157Z" fill="#e99bab" />
    <path d="M207 155v2" stroke="#bd7185" strokeWidth=".6" />
  </g>;
}
