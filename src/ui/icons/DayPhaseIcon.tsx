import type { DayPhase } from '@/game/systems/DayNightSystem';
import { claySvg, ellipse, line, path } from './SvgPaths';
import { StatusIcon } from './StatusIcons';

const PHASES: Record<DayPhase, { label: string; markup: string }> = {
  dawn: {
    label: '黎明',
    markup: claySvg(
      path('M12 43A20 20 0 0 1 52 43Z', '#e5bc6f') +
      line('M8 45H56', '#789b88', 4) +
      line('M32 30V9M24 17L32 9L40 17', '#98743d', 4),
    ),
  },
  day: {
    label: '白天',
    markup: claySvg(
      ellipse(32, 31, 13, 13, '#e5b765') +
      line('M32 5V11M32 51V57M6 31H12M52 31H58M13 12L18 17M46 45L51 50M13 50L18 45M46 17L51 12', '#bb8d49', 4),
    ),
  },
  dusk: {
    label: '黄昏',
    markup: claySvg(
      path('M12 43A20 20 0 0 1 52 43Z', '#d79571') +
      line('M8 45H56', '#789b88', 4) +
      line('M32 8V29M24 21L32 29L40 21', '#9e634f', 4),
    ),
  },
  night: {
    label: '黑夜',
    markup: claySvg(
      path('M35 7C12 7 5 35 22 50C35 60 52 51 56 37C34 47 22 24 35 7Z', '#8999ba') +
      path('M47 9L50 17L58 20L50 23L47 31L44 23L36 20L44 17Z', '#d5b16e'),
    ),
  },
};

/** 静态手绘 SVG；晨昏用升降箭头区分，小屏下不只依赖颜色。 */
export function DayPhaseIcon({ phase }: { phase: DayPhase }) {
  const { label, markup } = PHASES[phase];
  return (
    <span className="hud-phase" role="img" aria-label={`当前时段：${label}`} title={label}>
      <StatusIcon markup={markup} size={14} />
    </span>
  );
}
