import { Mill } from '../entities/Mill';
import { ProcessingSystem, type ProcessingSave } from './ProcessingSystem';

export const MILL_WHEAT_PER_BATCH = 1;
export const MILL_FLOUR_PER_BATCH = 2;
export const MILL_INTERVAL = 6;
export type MillSave = Omit<ProcessingSave, 'input' | 'output'> & { wheat: number; flour: number };
export type MillInfo = { wheat: number; flour: number; progress: number };

/** 磨坊：每批 1 小麦磨出 2 面粉，无需燃料。 */
export class MillSystem extends ProcessingSystem<MillSave> {
  constructor(...args: ConstructorParameters<typeof ProcessingSystem<MillSave>> extends [unknown, ...infer A] ? A : never) {
    super({
      kind: 'mill', input: 'wheat', output: 'flour',
      inputCount: MILL_WHEAT_PER_BATCH, outputCount: MILL_FLOUR_PER_BATCH, interval: MILL_INTERVAL,
      create: (scene, position, rotY) => new Mill(scene, position, rotY),
      encode: ({ input, output, ...rest }) => ({ ...rest, wheat: input, flour: output }),
      decode: ({ wheat, flour, ...rest }) => ({ ...rest, input: wheat, output: flour }),
    }, ...args);
  }
  takeWheat(...args: Parameters<ProcessingSystem<MillSave>['takeInput']>): boolean { return this.takeInput(...args); }
  info(...args: Parameters<ProcessingSystem<MillSave>['nearbyInfo']>): MillInfo | null {
    const state = super.nearbyInfo(...args);
    return state ? { wheat: state.input, flour: state.output, progress: state.progress } : null;
  }
}
