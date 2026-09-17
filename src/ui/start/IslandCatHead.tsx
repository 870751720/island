/** 帐篷里的可乐：与薯条同尺寸的灰白圆脸、金眼睛和不对称嘴边花纹。 */
export function IslandCatHead() {
  return <g strokeLinejoin="round" strokeLinecap="round" transform="translate(207 160) scale(.5) translate(-207 -160)">
    <path d="M194 145 193 130Q200 131 203 138L212 138Q216 131 222 130L220 146Z" fill="#686c70" />
    <path d="m196 135 1 8 4-3m13 0 5-5-1 8" fill="#bb8d90" />
    <path d="M192 146Q192 136 207 136Q222 136 222 146Q225 159 207 160Q189 159 192 146Z" fill="#eee9dd" />
    <path d="M192 146Q192 137 204 136L203 142 200 150 192 149ZM210 136Q222 137 222 146L222 150 214 149 211 142Z" fill="#686c70" />
    <path d="m204 142 3-4 4 12-4 3-5-3Z" fill="#eee9dd" />
    {[201, 214].map(x => <g key={x}>
      <ellipse cx={x} cy="146" rx="3.2" ry="3.5" fill="#343b3b" />
      <ellipse cx={x} cy="146" rx="2.7" ry="3" fill="#c8a449" />
      <ellipse cx={x} cy="146" rx="1" ry="2.6" fill="#16242a" />
      <circle cx={x - .8} cy="145" r=".7" fill="#fff9ec" />
    </g>)}
    <path d="M204 152Q207 150 210 152L207 154Z" fill="#37393c" />
    <path d="M200 155Q204 152 205 156L201 157ZM210 154Q213 153 214 156L210 157ZM217 151 220 152 219 156 216 155Z" fill="#686c70" />
    <path d="M207 154v2m-3 1q3 3 6 0" fill="none" stroke="#66605c" strokeWidth=".8" />
    <path d="m198 152-8-1m8 4-8 1m26-5 8-1m-8 5 8 2" fill="none" stroke="#b7b0a5" strokeWidth=".7" />
  </g>;
}
