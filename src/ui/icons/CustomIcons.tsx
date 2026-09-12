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

/** 鳀鱼:迷你银蓝小鱼 */
const AnchovyIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <FishShape color="#a9c3cc" rx={15} ry={8} />
    <path d="M16 34 q12 5 24 0" stroke="#7c98a3" strokeWidth={2} fill="none" strokeLinecap="round" />
  </Svg>
);

/** 竹荚鱼:青灰身 + 锐利侧线鳞 */
const HorseMackerelIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <FishShape color="#8ba3a0" rx={18} ry={10} dorsal={6} />
    <path d="M14 35 q14 7 28 0" stroke="#5c7470" strokeWidth={2.6} fill="none" strokeLinecap="round" />
  </Svg>
);

/** 小黄鱼:姜黄圆身 + 金色顶背 */
const YellowCroakerIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <FishShape color="#e3c56d" rx={17} ry={12} dorsal={7} />
    <path d="M16 24 q12 -6 24 0" stroke="#c9a53e" strokeWidth={2.4} fill="none" strokeLinecap="round" />
  </Svg>
);

/** 秋刀鱼:细长银蓝身 + 尖吻 */
const SauryIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <FishShape color="#7d97a8" rx={22} ry={7} sword dorsal={5} />
    <path d="M12 30 q16 4 32 0" stroke="#5d7586" strokeWidth={1.8} fill="none" strokeLinecap="round" />
  </Svg>
);

/** 带鱼:银白长带身 + 立齿吻 */
const HairtailIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <FishShape color="#cfd8dc" rx={23} ry={6} sword />
    <path d="M18 32 q10 -3 20 0" stroke="#a7b4ba" strokeWidth={1.6} fill="none" strokeLinecap="round" />
    <path d="M6 30 l3 2 M6 33 l3 -1" stroke="#8fa0a8" strokeWidth={1.4} strokeLinecap="round" />
  </Svg>
);

/** 草鱼:草绿大身 + 弧形鳞纹 */
const GrassCarpIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <FishShape color="#7ba05b" rx={19} ry={13} />
    <g stroke="#5c8040" strokeWidth={2} fill="none" strokeLinecap="round">
      <path d="M20 28 q3 4 0 8" />
      <path d="M26 26 q3 5 0 12" />
      <path d="M32 27 q3 5 0 10" />
    </g>
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

/** 皮毛:毛面翻开、露出深色衬里 */
const FurIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M12 20 L52 12 L56 48 L16 56 Z" fill="#7a4e30" />
    <path d="M12 20 L48 14 L44 44 L16 50 Z" fill="#c69a6d" />
    <path d="M18 26 l4 -6 M26 24 l4 -6 M34 22 l4 -6 M42 20 l4 -6" stroke="#e2c49a" strokeWidth={3} strokeLinecap="round" />
  </Svg>
);

/** 烤小鱼:竹签串着的小烤鱼 */
const CookedSmallFishIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <line x1={8} y1={56} x2={56} y2={8} stroke="#c9a06a" strokeWidth={3} strokeLinecap="round" />
    <g transform="rotate(-45 32 32)">
      <FishShape color="#c98a4e" rx={15} ry={8} />
      <path d="M24 27 q2 5 0 10 M30 25 q2 7 0 14" stroke="#96602e" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </g>
  </Svg>
);

/** 果树种子:种子抽芽并结出小红果 */
const FruitSeedIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M32 28 q-2 -8 3 -13" stroke="#6aa84f" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    <circle cx={38} cy={12} r={5} fill="#c0392b" />
    <path d="M30 18 q-6 -2 -7 4 q6 2 7 -4" fill="#8bc34a" />
    <ellipse cx={32} cy={44} rx={12} ry={13} fill="#9c6b3f" />
    <path d="M19 39 h26" stroke="#7a5230" strokeWidth={3} strokeLinecap="round" />
    <ellipse cx={32} cy={30} rx={11} ry={4.5} fill="#6b4526" />
  </Svg>
);

/** 草衣:草编上衣,领口、衣袖与下摆草须,衣身织纹 */
/** 草衣:圆领草织上衣(苔绿) */
const GrassShirtIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M20 16 L44 16 L56 28 L48 34 L46 56 L18 56 L16 34 L8 28 Z" fill="#7fae5e" />
    <path d="M32 16 L32 56" stroke="#5e8c44" strokeWidth={1.6} />
    <g stroke="#5e8c44" strokeWidth={1.4}>
      <path d="M22 24 l-4 8 M42 24 l4 8 M22 42 l-3 8 M42 42 l3 8" />
    </g>
    <path d="M26 16 q6 5 12 0" stroke="#466b32" strokeWidth={2} fill="none" />
  </Svg>
);

/** 草裤:缀叶草裤(苔绿) */
const GrassPantsIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M18 12 L46 12 L44 54 L34 54 L32 32 L30 54 L20 54 Z" fill="#7fae5e" />
    <rect x={18} y={12} width={28} height={5} fill="#5e8c44" />
    <g fill="#7fae4e">
      <ellipse cx={26} cy={24} rx={2.5} ry={5} transform="rotate(15 26 24)" />
      <ellipse cx={38} cy={24} rx={2.5} ry={5} transform="rotate(-15 38 24)" />
      <ellipse cx={26} cy={46} rx={2.5} ry={5} transform="rotate(10 26 46)" />
      <ellipse cx={38} cy={46} rx={2.5} ry={5} transform="rotate(-10 38 46)" />
    </g>
  </Svg>
);

/** 草帽:宽檐草帽(嫩绿) */
const StrawHatIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <ellipse cx={32} cy={40} rx={28} ry={8} fill="#8aab4e" />
    <path d="M14 40 Q32 10 50 40 Z" fill="#a8c86a" />
    <path d="M14 38 q18 -6 36 0" fill="none" stroke="#6d8c3a" strokeWidth={2} />
    <path d="M18 34 q14 -8 28 0" stroke="#6d8c3a" strokeWidth={1.4} fill="none" opacity={0.6} />
  </Svg>
);

/** 草包:网兜提包(嫩绿) */
const StrawBackpackIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M18 22 L46 22 L52 52 L12 52 Z" fill="#a8c86a" />
    <path d="M22 22 q10 -16 20 0" fill="none" stroke="#8a5a32" strokeWidth={3.5} />
    <g stroke="#6d8c3a" strokeWidth={1.3} fill="none">
      <path d="M20 30 h24 M17 40 h30 M14 50 h34 M24 22 l-4 30 M32 22 l0 30 M40 22 l4 30" />
    </g>
  </Svg>
);

/** 皮衣:长袖皮衣,奶油袖口与铜扣 */
const FurShirtIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M24 14 L40 14 L50 22 L58 40 L50 44 L45 32 L45 54 L19 54 L19 32 L14 44 L6 40 L14 22 Z" fill="#b77d55" />
    <path d="M27 16 q5 4 10 0" stroke="#674d43" strokeWidth={2} fill="none" />
    <rect x={6} y={38} width={10} height={5} rx={1} fill="#f6e7c5" />
    <rect x={48} y={38} width={10} height={5} rx={1} fill="#f6e7c5" />
    <circle cx={32} cy={30} r={2} fill="#dfb96c" />
    <circle cx={32} cy={40} r={2} fill="#dfb96c" />
  </Svg>
);

/** 皮裤:深棕短裤,皮带铜扣与奶油卷边 */
const FurPantsIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M18 14 L46 14 L44 48 L34 48 L32 30 L30 48 L20 48 Z" fill="#8a5a32" />
    <rect x={18} y={14} width={28} height={6} fill="#77503d" />
    <rect x={18} y={44} width={13} height={6} fill="#f6e7c5" />
    <rect x={33} y={44} width={13} height={6} fill="#f6e7c5" />
    <rect x={27} y={18} width={10} height={6} rx={1} fill="#dfb96c" />
  </Svg>
);

/** 皮帽:皮质报童帽,短鸭舌与铜扣 */
const FurHatIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <ellipse cx={32} cy={42} rx={22} ry={6} fill="#8a5a32" />
    <path d="M14 40 Q32 8 50 40 Z" fill="#b77d55" />
    <ellipse cx={32} cy={42} rx={18} ry={5} fill="#b77d55" />
    <path d="M12 44 L52 44 L48 48 L16 48 Z" fill="#674d43" />
    <rect x={18} y={36} width={8} height={5} rx={1} fill="#dfb96c" />
  </Svg>
);

/** 皮包:棕皮手提包,提手与铜扣 */
const FurBackpackIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M18 24 L46 24 L50 52 L14 52 Z" fill="#b77d55" />
    <path d="M24 24 q8 -16 16 0" fill="none" stroke="#77503d" strokeWidth={3.4} />
    <rect x={16} y={22} width={32} height={6} fill="#8a5a32" />
    <rect x={28} y={34} width={8} height={8} rx={1} fill="#dfb96c" />
  </Svg>
);

/** 铁甲:长袖海沫水手衫,奶油领口与袖口 */
const IronShirtIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M24 14 L40 14 L50 22 L58 40 L50 44 L45 32 L45 54 L19 54 L19 32 L14 44 L6 40 L14 22 Z" fill="#6dada6" />
    <path d="M27 16 q5 4 10 0" stroke="#f6e7c5" strokeWidth={2.4} fill="none" />
    <rect x={6} y={38} width={10} height={5} rx={1} fill="#f6e7c5" />
    <rect x={48} y={38} width={10} height={5} rx={1} fill="#f6e7c5" />
    <circle cx={32} cy={34} r={2.2} fill="#dfb96c" />
  </Svg>
);

/** 铁裤:海沫短裤,深色腰带与奶油卷边 */
const IronPantsIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M18 14 L46 14 L44 44 L34 44 L32 28 L30 44 L20 44 Z" fill="#6dada6" />
    <rect x={18} y={14} width={28} height={6} fill="#3f6f6b" />
    <rect x={18} y={40} width={13} height={6} fill="#f6e7c5" />
    <rect x={33} y={40} width={13} height={6} fill="#f6e7c5" />
  </Svg>
);

/** 铁帽:奶油宽檐水手帽,海沫帽带与铜徽 */
const IronHatIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <ellipse cx={32} cy={42} rx={26} ry={7} fill="#dcc9a0" />
    <path d="M14 42 Q32 14 50 42 Z" fill="#f6e7c5" />
    <path d="M16 38 q16 -6 32 0" fill="none" stroke="#6dada6" strokeWidth={3} />
    <rect x={18} y={34} width={7} height={5} rx={1} fill="#dfb96c" />
  </Svg>
);

/** 铁包:沙滩帆布手提包,海沫顶盖与铜扣 */
const IronBackpackIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M18 24 L46 24 L50 52 L14 52 Z" fill="#d7c196" />
    <path d="M24 24 q8 -16 16 0" fill="none" stroke="#77503d" strokeWidth={3.4} />
    <rect x={16} y={22} width={32} height={6} fill="#6dada6" />
    <circle cx={32} cy={38} r={4} fill="#dfb96c" />
  </Svg>
);

/** 沙丁鱼:细长银身 + 浅腹 */
const SardineIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <polygon points="18,27 28,22 34,27" fill="#b8cdd9" />
    <ellipse cx={26} cy={32} rx={20} ry={6} fill="#b8cdd9" />
    <ellipse cx={26} cy={33.5} rx={14.4} ry={2.7} fill="#d5e4ec" />
    <polygon points="44,32 58,27.2 58,36.8" fill="#b8cdd9" />
    <circle cx={15} cy={30.7} r={2.4} fill="#20303a" />
  </Svg>
);

/** 鲈鱼:草绿棘背 + 金腹 */
const PerchIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <polygon points="21.2,21 29.7,11 34.8,21" fill="#8aad5a" />
    <ellipse cx={28} cy={32} rx={17} ry={12} fill="#8aad5a" />
    <ellipse cx={28} cy={36} rx={12} ry={5} fill="#d4c56a" />
    <polygon points="43,32 57,22.4 57,41.6" fill="#8aad5a" />
    <circle cx={18.7} cy={29.4} r={2.4} fill="#20303a" />
  </Svg>
);

/** 铁矿石:灰岩角砾嵌金属与锈斑 */
const IronOreIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M10 36 L16 16 L36 8 L54 24 L56 46 L36 58 L14 52 Z" fill="#6c747e" />
    <path d="M16 16 L36 8 L40 22 L22 28 Z" fill="#8f97a1" />
    <polygon points="22,34 30,28 38,36 32,44" fill="#c9ccd1" />
    <polygon points="36,40 46,34 50,44 40,50" fill="#b07a5a" />
    <polygon points="18,44 26,42 28,52 18,52" fill="#4a5560" />
    <circle cx={34} cy={32} r={1.5} fill="#fff" />
  </Svg>
);

/** 铁锭:经典梯形锭,顶面亮、侧面暗 */
const IronIngotIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <polygon points="14,42 50,42 44,24 20,24" fill="#aab4bc" />
    <polygon points="20,24 44,24 42,20 22,20" fill="#c7d0d7" />
    <polygon points="50,42 44,24 42,20 46,26 51,43" fill="#7d8790" />
    <rect x={24} y={30} width={14} height={3} rx={1.5} fill="#e7edf1" opacity={0.8} />
  </Svg>
);

/** 蚯蚓:叶片旁的 C 形粉蚯蚓 */
const WormIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <ellipse cx={24} cy={20} rx={10} ry={6} fill="#7fae4e" transform="rotate(-24 24 20)" />
    <path d="M14 46 C14 28 46 28 46 46" fill="none" stroke="#e8a0a8" strokeWidth={8} strokeLinecap="round" />
    <circle cx={16} cy={44} r={1.4} fill="#5a3a3e" />
  </Svg>
);

/** 冒险家的经验书:蓝皮书 + 斜插的羽毛笔 */
const AdventureBookIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <rect x={12} y={18} width={34} height={38} rx={3} fill="#4a6f9c" />
    <rect x={12} y={18} width={5} height={38} fill="#38567c" />
    <path d="M50 10 q10 2 8 14 l-6 26 -6 -2 Z" fill="#f5ecd8" />
    <path d="M50 10 q10 2 8 14" fill="none" stroke="#c9bfa5" strokeWidth={1.5} />
    <path d="M52 14 L44 46" stroke="#b9ad90" strokeWidth={1.5} />
  </Svg>
);

/** 木斧:竖柄石斧,月牙石刃绑绳 */
const AxeIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <rect x={29} y={14} width={5} height={44} rx={2.5} fill="#b07b4a" />
    <path d="M32 10 L18 8 Q8 20 20 34 L32 24 Z" fill="#9aa0a6" />
    <path d="M18 8 Q8 20 20 34" fill="none" stroke="#b7bdc2" strokeWidth={2} />
    <g stroke="#c8a86a" strokeWidth={2}>
      <path d="M28 16 l8 6 M27 21 l8 6" />
    </g>
  </Svg>
);

/** 木镐:月牙双尖镐头垂直穿过竖柄 */
const PickaxeIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <rect x={30} y={14} width={5} height={46} rx={2.5} fill="#b07b4a" />
    <path d="M6 22 Q32 0 58 22 L54 27 Q32 8 10 27 Z" fill="#aab4bc" />
    <rect x={28} y={12} width={9} height={7} fill="#5a636b" opacity={0.35} />
    <path d="M14 24 Q30 10 50 24" fill="none" stroke="#e7edf1" strokeWidth={1.4} opacity={0.6} />
  </Svg>
);

/** 木铲:木柄 + 金属套管 + 梯形圆弧铲刃 */
const ShovelIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <rect x={30} y={6} width={5} height={30} rx={2.5} fill="#b07b4a" />
    <rect x={27} y={32} width={11} height={7} rx={1} fill="#5a636b" />
    <path d="M24 39 L40 39 L45 48 Q45 58 32 60 Q19 58 19 48 Z" fill="#aab4bc" />
    <path d="M24 44.5 L40 44.5" stroke="#7d8790" strokeWidth={1.5} opacity={0.5} />
    <path d="M23 50 Q27 55 32 55" fill="none" stroke="#e7edf1" strokeWidth={1.6} opacity={0.7} />
  </Svg>
);

/** 树枝鱼竿:弯竿钓起一尾小鱼,水面起波 */
const FishingRodIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M10 56 Q18 24 50 14" fill="none" stroke="#8a5a32" strokeWidth={4.5} strokeLinecap="round" />
    <path d="M50 14 Q56 30 48 40" fill="none" stroke="#e8e2d0" strokeWidth={1.5} />
    <path d="M42 42 q8 -6 12 0 l-3 6 q-5 6 -11 0 Z" fill="#6fa8c9" />
    <circle cx={45} cy={44} r={1.2} fill="#22333c" />
    <path d="M8 50 q10 -6 20 -2" stroke="#8fc6e6" strokeWidth={2} fill="none" />
  </Svg>
);

/** 树枝弓:弯弓搭箭 */
const BowIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M16 8 Q52 32 16 56" fill="none" stroke="#8a5a32" strokeWidth={4} strokeLinecap="round" />
    <path d="M16 8 L16 56" stroke="#e8e2d0" strokeWidth={1.5} />
    <path d="M8 32 L52 32" stroke="#b07b4a" strokeWidth={3} strokeLinecap="round" />
    <polygon points="52,32 44,28 44,36" fill="#aab4bc" />
    <polygon points="12,32 20,27 20,29.5 16,32 20,34.5 20,37" fill="#e2e0d2" />
  </Svg>
);

/** 木剑:十字护手 + 圆头柄剑 */
const SwordIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <rect x={29} y={6} width={6} height={38} fill="#aab4bc" />
    <polygon points="32,2 28,10 36,10" fill="#aab4bc" opacity={0.9} />
    <path d="M31 10 L31 42" stroke="#ffffff" strokeWidth={1.4} opacity={0.5} />
    <rect x={18} y={44} width={28} height={6} rx={2} fill="#e6b84c" />
    <rect x={18} y={47} width={28} height={3} rx={1.5} fill="#b98f2f" opacity={0.6} />
    <rect x={28} y={50} width={8} height={9} rx={2} fill="#8a5a32" />
    <circle cx={32} cy={60} r={3} fill="#e6b84c" />
  </Svg>
);

/** 燧石:剥片燧石,尖端顶焰 */
const FlintIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <polygon points="8,56 16,28 40,22 50,48 28,60" fill="#3d4550" />
    <polygon points="16,28 40,22 38,34 20,38" fill="#9aa3ad" />
    <polygon points="20,38 38,34 46,50 28,58" fill="#5a6470" />
    <path d="M34 24 L42 6 L52 22 L40 28 Z" fill="#f4c84a" />
    <path d="M40 20 L48 4 L56 20 Z" fill="#f28b2e" />
    <path d="M44 14 L52 6" stroke="#ffe9a0" strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

/** 树枝:弯枝分杈 */
const BranchIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M12 52 Q26 44 34 28 Q40 16 52 10" stroke="#6b3e1c" strokeWidth={10} fill="none" strokeLinecap="round" />
    <path d="M12 52 Q26 44 34 28 Q40 16 52 10" stroke="#8b5a2b" strokeWidth={7} fill="none" strokeLinecap="round" />
    <path d="M34 30 L18 18" stroke="#9a6a3a" strokeWidth={5.5} strokeLinecap="round" />
  </Svg>
);

/** 火把:木柄缠布,顶端火苗 */
const TorchIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <rect x={28} y={28} width={8} height={30} rx={3} fill="#8a6b45" />
    <path d="M28 34 q4 3 8 0 M28 42 q4 3 8 0" stroke="#6b4f33" strokeWidth={1.8} fill="none" strokeLinecap="round" />
    <rect x={25} y={22} width={14} height={10} rx={3} fill="#a3572e" />
    <path d="M25 26 h14" stroke="#8a4522" strokeWidth={1.8} />
    <path d="M32 22 Q20 16 26 6 Q28 12 32 12 Q30 5 38 3 Q36 9 40 13 Q43 17 38 21 Q35 23 32 22 Z" fill="#e67e22" />
    <path d="M32 20 Q27 16 30 10 Q31 14 33 14 Q33 10 36 8 Q36 12 37 14 Q38 18 34 20 Q33 21 32 20 Z" fill="#f7c948" />
  </Svg>
);

/** 木围栏:尖桩栅栏 */
const FenceWoodIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <g fill="#a0784a">
      <rect x={10} y={14} width={8} height={38} rx={1.5} />
      <polygon points="10,14 14,6 18,14" />
      <rect x={28} y={14} width={8} height={38} rx={1.5} />
      <polygon points="28,14 32,6 36,14" />
      <rect x={46} y={14} width={8} height={38} rx={1.5} />
      <polygon points="46,14 50,6 54,14" />
      <rect x={7} y={22} width={50} height={6} rx={2} />
      <rect x={7} y={38} width={50} height={6} rx={2} />
    </g>
  </Svg>
);

/** 石围栏:垒石矮墙 */
const FenceStoneIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <g fill="#9aa5a0" stroke="#6f7a75" strokeWidth={1.5}>
      <rect x={6} y={12} width={22} height={13} rx={4} />
      <rect x={31} y={12} width={27} height={13} rx={4} />
      <rect x={6} y={27} width={14} height={13} rx={4} />
      <rect x={22} y={27} width={20} height={13} rx={4} />
      <rect x={44} y={27} width={14} height={13} rx={4} />
      <rect x={6} y={42} width={22} height={13} rx={4} />
      <rect x={31} y={42} width={27} height={13} rx={4} />
    </g>
  </Svg>
);

/** 浆果丛:绿丛上结红果 */
const BerryBushIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M8 50 Q6 30 20 26 Q22 14 34 16 Q48 14 50 28 Q60 34 56 50 Z" fill="#5d9c46" />
    <g fill="#c0392b">
      <circle cx={20} cy={36} r={4} />
      <circle cx={32} cy={30} r={4} />
      <circle cx={44} cy={36} r={4} />
      <circle cx={26} cy={45} r={4} />
      <circle cx={38} cy={45} r={4} />
    </g>
    <g fill="rgba(255,255,255,0.5)">
      <circle cx={18.8} cy={34.8} r={1.2} />
      <circle cx={30.8} cy={28.8} r={1.2} />
      <circle cx={42.8} cy={34.8} r={1.2} />
    </g>
  </Svg>
);

/** 锄头:长柄底部垂直伸出的锄板,刃在板外缘 */
export const HoeIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <rect x={30} y={6} width={5} height={44} rx={2.5} fill="#b07b4a" />
    <path d="M33 44 L16 37 Q5 37 8 51 L21 52 L33 52 Z" fill="#aab4bc" />
    <path d="M16 37 Q5 37 8 51" fill="none" stroke="#7d8790" strokeWidth={2} />
    <rect x={29} y={42} width={8} height={11} fill="#5a636b" opacity={0.3} />
  </Svg>
);

/** 植物纤维:三片宽叶(区别于麦穗 🌾) */
const FiberIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <path d="M32 56 Q12 40 16 12 Q32 22 32 56" fill="#7d9a43" />
    <path d="M32 58 Q32 20 32 8 Q48 18 32 58" fill="#b5d47a" />
    <path d="M32 56 Q52 40 48 12 Q32 22 32 56" fill="#8fae4e" />
  </Svg>
);

/** 自绘图标表:键为道具 kind,渲染时优先于 ITEMS 的 emoji */
/** 作物种子通用形:土色种粒 + 顶上一支嫩芽,旁边配一小块作物色的果标记区分种类 */
function CropSeedIcon({
  size,
  color,
  marker,
}: IconProps & {
  color: string;
  marker: 'round' | 'taper' | 'cob' | 'bean' | 'berry' | 'head' | 'big' | 'potato' | 'egg' | 'grain';
}): React.ReactNode {
  return (
    <Svg size={size}>
      <ellipse cx={26} cy={40} rx={11} ry={14} fill="#c9a06a" transform="rotate(-12 26 40)" />
      <rect x={24.6} y={18} width={2.8} height={12} rx={1.4} fill="#7fae55" />
      <ellipse cx={18} cy={19} rx={7.5} ry={4.2} fill="#8fc47a" transform="rotate(-35 18 19)" />
      <ellipse cx={34} cy={17} rx={7.5} ry={4.2} fill="#8fc47a" transform="rotate(30 34 17)" />
      {marker === 'round' && <circle cx={47} cy={44} r={9} fill={color} />}
      {marker === 'berry' && <path d="M47 37c6 0 9 4 9 9 0 6-4 10-9 10s-9-4-9-10c0-5 3-9 9-9z" fill={color} />}
      {marker === 'taper' && <polygon points="42,36 52,36 47,56" fill={color} />}
      {marker === 'cob' && (
        <g>
          <rect x={42} y={34} width={10} height={20} rx={5} fill={color} />
          <rect x={40} y={40} width={4} height={10} rx={2} fill="#6aa74e" />
        </g>
      )}
      {marker === 'bean' && (
        <g>
          <ellipse cx={44} cy={45} rx={6} ry={4.5} fill={color} />
          <ellipse cx={53} cy={50} rx={6} ry={4.5} fill={color} />
        </g>
      )}
      {marker === 'head' && (
        <g>
          <circle cx={47} cy={45} r={9} fill={color} />
          <path d="M38 46q9 6 18 0" stroke="#6aa74e" strokeWidth={2} fill="none" />
        </g>
      )}
      {marker === 'big' && (
        <g>
          <ellipse cx={47} cy={45} rx={11} ry={9} fill={color} />
          <rect x={45.8} y={33} width={2.4} height={6} rx={1.2} fill="#7a6a3a" />
        </g>
      )}
      {marker === 'potato' && <ellipse cx={47} cy={45} rx={10} ry={8} fill={color} transform="rotate(-15 47 45)" />}
      {marker === 'egg' && <rect x={42} y={33} width={10} height={22} rx={5} fill={color} transform="rotate(18 47 44)" />}
      {marker === 'grain' && (
        <g>
          <ellipse cx={47} cy={41} rx={4} ry={8} fill={color} transform="rotate(15 47 41)" />
          <ellipse cx={53} cy={49} rx={4} ry={8} fill={color} transform="rotate(-20 53 49)" />
        </g>
      )}
    </Svg>
  );
}

const CarrotSeedIcon: FC<IconProps> = (p) => <CropSeedIcon {...p} color="#e07b2a" marker="taper" />;
const WheatSeedIcon: FC<IconProps> = (p) => <CropSeedIcon {...p} color="#e8c56a" marker="grain" />;
const PotatoSeedIcon: FC<IconProps> = (p) => <CropSeedIcon {...p} color="#c9a06a" marker="potato" />;
const SweetPotatoSeedIcon: FC<IconProps> = (p) => <CropSeedIcon {...p} color="#c96a3a" marker="taper" />;
const CornSeedIcon: FC<IconProps> = (p) => <CropSeedIcon {...p} color="#e8c56a" marker="cob" />;
const SoybeanSeedIcon: FC<IconProps> = (p) => <CropSeedIcon {...p} color="#9aa74e" marker="bean" />;
const TomatoSeedIcon: FC<IconProps> = (p) => <CropSeedIcon {...p} color="#d94a3a" marker="round" />;
const PepperSeedIcon: FC<IconProps> = (p) => <CropSeedIcon {...p} color="#d93a2a" marker="taper" />;
const EggplantSeedIcon: FC<IconProps> = (p) => <CropSeedIcon {...p} color="#6a3a8a" marker="egg" />;
const StrawberrySeedIcon: FC<IconProps> = (p) => <CropSeedIcon {...p} color="#d93a4a" marker="berry" />;
const CabbageSeedIcon: FC<IconProps> = (p) => <CropSeedIcon {...p} color="#8fc47a" marker="head" />;
const PumpkinSeedIcon: FC<IconProps> = (p) => <CropSeedIcon {...p} color="#e0862a" marker="big" />;

export const CUSTOM_ICONS: Partial<Record<ResourceKind, FC<IconProps>>> = {
  branch: BranchIcon,
  flint: FlintIcon,
  ironIngot: IronIngotIcon,
  worm: WormIcon,
  adventureBook: AdventureBookIcon,
  axe: AxeIcon,
  pickaxe: PickaxeIcon,
  shovel: ShovelIcon,
  hoe: HoeIcon,
  fishingrod: FishingRodIcon,
  bow: BowIcon,
  sword: SwordIcon,
  strawHat: StrawHatIcon,
  strawBackpack: StrawBackpackIcon,
  furShirt: FurShirtIcon,
  furPants: FurPantsIcon,
  furHat: FurHatIcon,
  furBackpack: FurBackpackIcon,
  ironShirt: IronShirtIcon,
  ironPants: IronPantsIcon,
  ironHat: IronHatIcon,
  ironBackpack: IronBackpackIcon,
  sardine: SardineIcon,
  perch: PerchIcon,
  fiber: FiberIcon,
  oakSeed: OakSeedIcon,
  pineFruit: PineFruitIcon,
  colaZero: ColaZeroIcon,
  loach: LoachIcon,
  grouper: GrouperIcon,
  catfish: CatfishIcon,
  anchovy: AnchovyIcon,
  horseMackerel: HorseMackerelIcon,
  yellowCroaker: YellowCroakerIcon,
  saury: SauryIcon,
  hairtail: HairtailIcon,
  grassCarp: GrassCarpIcon,
  swordfish: SwordfishIcon,
  manta: MantaIcon,
  goldenFish: GoldenFishIcon,
  cookedBerry: CookedBerryIcon,
  cookedBigFish: CookedBigFishIcon,
  fur: FurIcon,
  cookedSmallFish: CookedSmallFishIcon,
  fruitSeed: FruitSeedIcon,
  grassShirt: GrassShirtIcon,
  grassPants: GrassPantsIcon,
  fenceWood: FenceWoodIcon,
  fenceStone: FenceStoneIcon,
  berryBush: BerryBushIcon,
  arrow: ArrowIcon,
  ironOre: IronOreIcon,
  torch: TorchIcon,
  carrotSeed: CarrotSeedIcon,
  wheatSeed: WheatSeedIcon,
  potatoSeed: PotatoSeedIcon,
  sweetPotatoSeed: SweetPotatoSeedIcon,
  cornSeed: CornSeedIcon,
  soybeanSeed: SoybeanSeedIcon,
  tomatoSeed: TomatoSeedIcon,
  pepperSeed: PepperSeedIcon,
  eggplantSeed: EggplantSeedIcon,
  strawberrySeed: StrawberrySeedIcon,
  cabbageSeed: CabbageSeedIcon,
  pumpkinSeed: PumpkinSeedIcon,
};
