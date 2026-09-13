'use client';

import type { FC } from 'react';
import type { ResourceKind } from '@/game/systems/Inventory';
import { CLAY_ICONS } from './ClayIcons';

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
  oakSeed: OakSeedIcon,
  fruitSeed: FruitSeedIcon,
  fenceWood: FenceWoodIcon,
  fenceStone: FenceStoneIcon,
  berryBush: BerryBushIcon,
  arrow: ArrowIcon,
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
  ...CLAY_ICONS,
};
