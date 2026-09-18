'use client';
import type { HudSnapshot } from '@/game/GameContracts';
import { LOOM_ROPE_PER_CLOTH, LOOM_OUTPUT_COUNT, LOOM_INTERVAL } from '@/game/systems/LoomSystem';
import { ProcessingPanel } from './ProcessingPanel';
import { itemCount } from './inventorySnapshot';

type Props = { hud: HudSnapshot; onFeed: (count: number) => void; onCollect: () => void; onTakeRope: () => void; onClose: () => void };
export function LoomPanel({ hud, onTakeRope, ...actions }: Props) {
  const state = hud.loomInfo;
  return <ProcessingPanel kind="loom" input="rope" output="cloth"
    inputCount={LOOM_ROPE_PER_CLOTH} outputCount={LOOM_OUTPUT_COUNT} interval={LOOM_INTERVAL}
    info={state ? { input: state.rope, output: state.cloth, progress: state.progress } : null}
    inBag={itemCount(hud.slots, 'rope')} onTakeInput={onTakeRope} {...actions} />;
}
