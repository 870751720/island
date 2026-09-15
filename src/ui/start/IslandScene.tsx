'use client';
import { useEffect, useState } from 'react';
import { IslandTree, IslandBerryBush } from './IslandScenery';
import { IslandTentEgg, IslandSeaEgg, IslandFireEgg } from './IslandEggs';
import { IslandFisher } from './IslandFisher';
/** 纯 SVG 菜单插画，不创建游戏世界或额外 WebGL 上下文。 */
export function IslandScene({ paused, interactive = false }: { paused: boolean; interactive?: boolean }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return (
    <svg className="menu-island" data-paused={paused || hidden} data-interactive={interactive} viewBox="0 0 380 245" role="group" aria-label="海岛小景">
      <circle className="sun" cx="310" cy="40" r="15" fill="#fff2cd" opacity=".8" />
      {interactive && <IslandSeaEgg />}
      <g className="water" pointerEvents="none" fill="none" stroke="#eef5d7" strokeWidth="2">
        <ellipse className="wave" cx="190" cy="186" rx="167" ry="44" opacity=".5" />
        <ellipse className="wave second" cx="190" cy="186" rx="145" ry="33" opacity=".45" />
        <path d="M17 121h22m286 11h29M32 223h35" opacity=".6" />
      </g>
      <g className="isle">
        <g className="island-ground">
          <ellipse cx="190" cy="190" rx="130" ry="28" fill="#44695c" opacity=".2" />
          <path d="M58 163 82 136 153 112 229 119 295 147 323 175 296 198 238 214 161 214 92 194Z" fill="#c3ae77" />
          <path d="M58 159 82 132 153 108 229 115 295 143 323 170 296 191 238 207 161 207 92 187Z" fill="#e8d8a0" />
          <path d="M77 150 103 130 157 115 230 124 280 146 294 166 251 185 177 186 111 172Z" fill="#7cb45b" />
          <path d="M77 150 111 172 177 186 185 159 137 132Z" fill="#92ba6d" />
          <path d="M185 159 177 186 251 185 294 166 246 148Z" fill="#62964e" />
          <ellipse cx="119" cy="150" rx="30" ry="10" fill="#44694d" opacity=".22" />
          <IslandTree interactive={interactive} transform="translate(122 146) scale(.96)" />
          <IslandTree interactive={interactive} transform="translate(164 126) scale(.71)" />
          <IslandTree interactive={interactive} transform="translate(269 159) scale(.72)" />
          <path d="M176 160 205 116 242 159Z" fill="#e4b575" />
          <path d="M205 116 259 135 270 166 242 159Z" fill="#bd8c56" />
          <path d="M191 160 207 131 224 161Z" fill="#655e44" />
          <path d="M205 116 207 160" stroke="#ffe3a3" strokeWidth="2" />
          {interactive && <IslandTentEgg />}
          <g fill="#8f9e87">
            <path d="M80 175 87 163 99 163 106 177 94 183Z" />
            <path d="M282 186 290 173 302 177 307 187 295 192Z" />
          </g>
          <path d="M132 190 150 199m-7-15 15 8" stroke="#a48859" strokeWidth="4" strokeLinecap="round" />
        </g>
        <IslandBerryBush />
        <path d="m214 180 20-7m-20 0 20 7" stroke="#846046" strokeWidth="5" strokeLinecap="round" />
        <IslandFireEgg interactive={interactive} />
      </g>
      <g className="birds" fill="none" stroke="#537b69" strokeWidth="2" strokeLinecap="round">
        <path d="M57 56q6-5 12 1 6-6 12-2M243 32q4-4 8 0 4-4 8-1" />
      </g>
      <IslandFisher />
    </svg>
  );
}
