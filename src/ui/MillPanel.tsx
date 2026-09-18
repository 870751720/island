'use client';
import type { HudSnapshot } from '@/game/GameContracts';
import { MILL_WHEAT_PER_BATCH, MILL_FLOUR_PER_BATCH, MILL_INTERVAL } from '@/game/systems/MillSystem';
import { ProcessingPanel } from './ProcessingPanel';
import { itemCount } from './inventorySnapshot';

type Props = { hud: HudSnapshot; onFeed: (count: number) => void; onCollect: () => void; onTakeWheat: () => void; onClose: () => void };
export function MillPanel({ hud, onTakeWheat, ...actions }: Props) {
  const state = hud.millInfo;
  return <ProcessingPanel kind="mill" input="wheat" output="flour"
    inputCount={MILL_WHEAT_PER_BATCH} outputCount={MILL_FLOUR_PER_BATCH} interval={MILL_INTERVAL}
    info={state ? { input: state.wheat, output: state.flour, progress: state.progress } : null}
    inBag={itemCount(hud.slots, 'wheat')} onTakeInput={onTakeWheat} {...actions} />;
}
