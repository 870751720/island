import type { HudSnapshot } from '@/game/GameContracts';
import { DOG_STAGES } from '@/game/systems/DogGrowth';
import { DOG_EMOJI_SVG } from './icons/DogEmojiIcons';
import { gameTheme } from './gameTheme';

/** 角色页里的同行伙伴；经验使用累计口径，与成长阈值一致。 */
export function DogCompanionCard({ dog }: { dog: HudSnapshot['dog'] }) {
  if (!dog) return null;
  const stage = DOG_STAGES[dog.stage - 1] ?? DOG_STAGES[0];
  const next = DOG_STAGES.find(item => item.stage === stage.stage + 1);
  const progress = next ? Math.max(0, Math.min(1, dog.xp / next.xp)) : 1;
  return <section aria-label="博美" style={{ marginTop: 10, padding: '12px 10px', borderRadius: 12, background: gameTheme.inset, color: gameTheme.ink }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span aria-hidden="true" style={{ width: 36, height: 36, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: DOG_EMOJI_SVG['dog-companion'] }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>博美 <span style={{ fontWeight: 400, fontSize: 11, color: gameTheme.muted }}>同行的小伙伴</span></div>
        <div style={{ marginTop: 3, fontSize: 12 }}>第 {stage.stage} 阶段 · {stage.name}</div>
      </div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 10, fontSize: 12 }}>
      <span>成长经验</span><span>{dog.xp} / {next?.xp ?? stage.xp}{!next && ' · 已满阶'}</span>
    </div>
    <div role="progressbar" aria-label="博美成长" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-valuetext={`成长经验 ${dog.xp}，第 ${stage.stage} 阶段`}
      style={{ height: 5, borderRadius: 6, background: '#58786120', marginTop: 5, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${progress * 100}%`, background: '#799866', borderRadius: 6 }} />
    </div>
    <div style={{ marginTop: 7, fontSize: 11, color: gameTheme.muted }}>{next ? '分它一口吃的，陪你走一段路。' : '小小的身影，已经能独当一面。'}</div>
  </section>;
}
