'use client';

import type { FC } from 'react';
import type { ResourceKind } from '@/game/systems/Inventory';

/**
 * 自绘道具图标:emoji 找不到贴切表达(或与其他道具撞图标)时用简笔 SVG 补位。
 * 统一 64×64 视口、纯色块面,与游戏的手工黏土质感呼应;ITEMS 里的 emoji 仅作纯文本场合的回退。
 */

type IconProps = { size: number };

function Svg({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {children}
    </svg>
  );
}

/** 通用鱼形:椭圆身 + 三角尾,按参数拼出不同鱼种 */
function FishShape({
  color,
  rx = 18,
  ry = 12,
  whiskers = false,
  spots = 0,
  sword = false,
  dorsal = 0,
}: {
  color: string;
  rx?: number;
  ry?: number;
  whiskers?: boolean;
  spots?: number;
  sword?: boolean;
  dorsal?: number;
}) {
  const cx = 28;
  const cy = 32;
  return (
    <>
      {sword && <polygon points={`2,${cy} ${cx - rx},${cy - ry * 0.55} ${cx - rx},${cy + ry * 0.55}`} fill={color} />}
      {dorsal > 0 && (
        <polygon
          points={`${cx - rx * 0.45},${cy - ry + 1} ${cx + rx * 0.15},${cy - ry - dorsal} ${cx + rx * 0.35},${cy - ry + 1}`}
          fill={color}
        />
      )}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={color} />
      <polygon
        points={`${cx + rx - 3},${cy} ${cx + rx + 13},${cy - ry * 0.85} ${cx + rx + 13},${cy + ry * 0.85}`}
        fill={color}
      />
      {whiskers && (
        <path
          d={`M${cx - rx + 2},${cy - 2} q-7 -1 -10 -7 M${cx - rx + 2},${cy + 3} q-7 1 -10 7`}
          stroke={color}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
      )}
      {spots > 0 && (
        <g fill="rgba(0,0,0,0.28)">
          {Array.from({ length: spots }, (_, i) => (
            <circle key={i} cx={cx - rx * 0.5 + (i * rx * 0.9) / Math.max(spots - 1, 1)} cy={cy - ry * 0.3 + (i % 2) * ry * 0.55} r={2.6} />
          ))}
        </g>
      )}
      <circle cx={cx - rx * 0.55} cy={cy - ry * 0.25} r={2.8} fill="#20303a" />
    </>
  );
}

/** 橡树种子:带嫩芽的种子,与果实橡果(🌰)区分 */
const OakSeedIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M32 26 q-2 -10 4 -16" stroke="#6aa84f" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    <path d="M36 12 q8 -4 10 4 q-8 4 -10 -4" fill="#6aa84f" />
    <path d="M34 18 q-8 -3 -9 5 q8 3 9 -5" fill="#8bc34a" />
    <ellipse cx={32} cy={42} rx={13} ry={14} fill="#9c6b3f" />
    <path d="M18 36 h28" stroke="#7a5230" strokeWidth={3} strokeLinecap="round" />
    <ellipse cx={32} cy={27} rx={12} ry={5} fill="#6b4526" />
  </Svg>
);

/** 松果:褐色鳞片锥体 */
const PineFruitIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <rect x={30} y={8} width={4} height={8} rx={2} fill="#7a5230" />
    <ellipse cx={32} cy={38} rx={14} ry={22} fill="#8a6b45" />
    <g stroke="#6b4f33" strokeWidth={2} strokeLinecap="round">
      <path d="M20 30 q6 4 12 0 q6 4 12 0" fill="none" />
      <path d="M20 38 q6 4 12 0 q6 4 12 0" fill="none" />
      <path d="M21 46 q6 4 11 0 q6 4 11 0" fill="none" />
      <path d="M24 53 q5 4 8 0 q4 4 8 0" fill="none" />
    </g>
  </Svg>
);

/** 无糖可乐:黑色易拉罐,与可乐(🥤)区分 */
const ColaZeroIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <rect x={20} y={14} width={24} height={42} rx={5} fill="#2f3542" />
    <ellipse cx={32} cy={15} rx={12} ry={4} fill="#c8cdd6" />
    <path d="M29 12 q3 -3 6 0" stroke="#c8cdd6" strokeWidth={2} fill="none" />
    <path d="M20 26 h24 M20 44 h24" stroke="#4a5262" strokeWidth={3} />
  </Svg>
);

/** 泥鳅:细长身 + 小须 */
const LoachIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <FishShape color="#8a7a4a" rx={22} ry={8} whiskers />
  </Svg>
);

/** 石斑鱼:敦实身 + 深色斑点 */
const GrouperIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <FishShape color="#6d7b5a" rx={19} ry={14} spots={5} />
  </Svg>
);

/** 巨鲶:宽头 + 长须 */
const CatfishIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <FishShape color="#5b664f" rx={20} ry={11} whiskers />
  </Svg>
);

/** 剑鱼:长吻 + 高背鳍 */
const SwordfishIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <FishShape color="#5a7d9e" rx={16} ry={9} sword dorsal={12} />
  </Svg>
);

/** 魔鬼鱼:俯视菱形翼 + 细尾 */
const MantaIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M32 12 L58 34 L44 38 L32 30 L20 38 L6 34 Z" fill="#4a5568" />
    <path d="M32 30 L32 34 L36 54 L32 58 L28 54 L32 34" fill="#3d4657" />
    <circle cx={26} cy={22} r={2.2} fill="#e8ecf2" />
    <circle cx={38} cy={22} r={2.2} fill="#e8ecf2" />
  </Svg>
);

/** 黄金鱼:金身 + 星光 */
const GoldenFishIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <FishShape color="#e6b422" rx={18} ry={12} />
    <path d="M14 8 l1.4 3.6 L19 13 l-3.6 1.4 L14 18 l-1.4 -3.6 L9 13 l3.6 -1.4 Z" fill="#fff3b0" />
    <path d="M50 10 l1 2.6 L54 13 l-2.6 1 L50 17 l-1 -3 L46.6 14 L49.9 12.6 Z" fill="#fff3b0" />
  </Svg>
);

/** 烤浆果:焦糖色浆果串 */
const CookedBerryIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M20 12 L44 50" stroke="#8a6b45" strokeWidth={3} strokeLinecap="round" />
    <circle cx={26} cy={24} r={7} fill="#8e3b46" />
    <circle cx={38} cy={38} r={7} fill="#8e3b46" />
    <circle cx={30} cy={44} r={6} fill="#a0522d" />
    <circle cx={44} cy={28} r={6} fill="#a0522d" />
    <circle cx={24} cy={22} r={1.8} fill="#c97b7b" />
    <circle cx={37} cy={36} r={1.8} fill="#c97b7b" />
  </Svg>
);

/** 烤大鱼:焦棕鱼身 + 烤痕 */
const CookedBigFishIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <FishShape color="#b06a35" rx={19} ry={13} />
    <g stroke="#7c4520" strokeWidth={3} strokeLinecap="round">
      <path d="M20 24 q2 8 0 16" fill="none" />
      <path d="M28 22 q2 10 0 20" fill="none" />
      <path d="M36 24 q2 8 0 16" fill="none" />
    </g>
  </Svg>
);

/** 箭:木杆 + 箭簇 + 红羽,与弓(🏹)区分 */
const ArrowIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <line x1={14} y1={50} x2={48} y2={16} stroke="#a0784a" strokeWidth={4} strokeLinecap="round" />
    <polygon points="48,16 56,8 52,20" fill="#9aa5b1" />
    <polygon points="56,8 44,12 50,18" fill="#9aa5b1" />
    <polygon points="14,50 8,56 12,44" fill="#c0392b" />
    <polygon points="20,44 10,50 16,54" fill="#e74c3c" />
  </Svg>
);

/** 自绘图标表:键为道具 kind,渲染时优先于 ITEMS 的 emoji */
export const CUSTOM_ICONS: Partial<Record<ResourceKind, FC<IconProps>>> = {
  oakSeed: OakSeedIcon,
  pineFruit: PineFruitIcon,
  colaZero: ColaZeroIcon,
  loach: LoachIcon,
  grouper: GrouperIcon,
  catfish: CatfishIcon,
  swordfish: SwordfishIcon,
  manta: MantaIcon,
  goldenFish: GoldenFishIcon,
  cookedBerry: CookedBerryIcon,
  cookedBigFish: CookedBigFishIcon,
  arrow: ArrowIcon,
};
