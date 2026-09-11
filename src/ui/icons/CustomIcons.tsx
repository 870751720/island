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
const GrassShirtIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    {/* 衣袖 */}
    <path d="M20 14 L10 22 L12 32 L22 27 Z" fill="#8f9e3e" />
    <path d="M44 14 L54 22 L52 32 L42 27 Z" fill="#8f9e3e" />
    {/* 衣身 */}
    <path d="M20 13 Q32 8 44 13 L44 48 L20 48 Z" fill="#a9b24a" />
    {/* 领口 */}
    <path d="M27 12 Q32 18 37 12 Q32 9 27 12 Z" fill="#6f7a2e" />
    {/* 织纹:横向草束 + 交错针脚 */}
    <g stroke="#8f9e3e" strokeWidth={2} strokeLinecap="round">
      <path d="M21 22 h22 M21 30 h22 M21 38 h22" />
    </g>
    <g stroke="#c3ca6e" strokeWidth={1.6} strokeLinecap="round">
      <path d="M24 26 l4 -3 M32 26 l4 -3 M24 34 l4 -3 M32 34 l4 -3 M24 42 l4 -3 M32 42 l4 -3" />
    </g>
    {/* 下摆草须 */}
    <g stroke="#8f9e3e" strokeWidth={2.2} strokeLinecap="round">
      <path d="M22 48 v8 M27 48 v10 M32 48 v9 M37 48 v10 M42 48 v8" />
    </g>
  </Svg>
);

/** 草裤:草编短裤,腰带 + 织纹 + 裤脚草须 */
const GrassPantsIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    {/* 裤身 */}
    <path d="M18 16 L46 16 L44 46 L36 46 L33 28 L30 46 L20 46 Z" fill="#a9b24a" />
    {/* 腰带 */}
    <rect x={17} y={11} width={30} height={7} rx={2} fill="#8f9e3e" />
    <rect x={29} y={10} width={6} height={9} rx={2} fill="#6f7a2e" />
    {/* 织纹:横向草束 + 交错针脚 */}
    <g stroke="#8f9e3e" strokeWidth={2} strokeLinecap="round">
      <path d="M20 24 h12 M33 24 h11 M20 32 h10 M32 32 h11 M21 40 h9 M33 40 h10" />
    </g>
    <g stroke="#c3ca6e" strokeWidth={1.6} strokeLinecap="round">
      <path d="M23 28 l4 -3 M38 28 l4 -3 M24 36 l4 -3 M38 36 l4 -3" />
    </g>
    {/* 裤脚草须 */}
    <g stroke="#8f9e3e" strokeWidth={2.2} strokeLinecap="round">
      <path d="M21 46 v8 M25 46 v9 M39 46 v9 M43 46 v8" />
    </g>
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

/** 铁锭:两块叠放的梯形锭 */
const IronIngotIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <polygon points="14,28 44,22 50,36 20,42" fill="#6b737c" />
    <polygon points="14,28 44,22 42,16 16,22" fill="#aeb6be" />
    <polygon points="16,34 48,28 54,44 22,50" fill="#8a9199" />
    <polygon points="16,34 48,28 46,22 18,28" fill="#d5dbe2" />
    <polygon points="48,28 54,44 50,44 46,28" fill="#5a626b" />
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

/** 锄头:斜置木柄 + 顶端横向扁刃(与柄垂直,切土的形状) */
export const HoeIcon: FC<IconProps> = ({ size }) => (
  <Svg size={size}>
    <g transform="rotate(45 32 32)">
      {/* 刃:横在柄顶的扁宽金属块 */}
      <rect x="15" y="7" width="34" height="10" rx="3" fill="#98a0a8" />
      {/* 柄颈:连接刃与柄的短粗颈 */}
      <rect x="28" y="14" width="8" height="8" fill="#98a0a8" />
      {/* 木柄 */}
      <rect x="29" y="18" width="6" height="40" rx="3" fill="#8a6239" />
      {/* 柄尾缠绳 */}
      <rect x="28" y="48" width="8" height="7" rx="2" fill="#c9b588" />
    </g>
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
  hoe: HoeIcon,
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
