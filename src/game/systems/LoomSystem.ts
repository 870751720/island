import { Loom } from '../entities/Loom';
import { ProcessingSystem, type ProcessingSave } from './ProcessingSystem';

export const LOOM_ROPE_PER_CLOTH = 2;
export const LOOM_OUTPUT_COUNT = 1;
export const LOOM_INTERVAL = 6;
export type LoomSave = Omit<ProcessingSave, 'input' | 'output'> & { rope: number; cloth: number };
export type LoomInfo = { rope: number; cloth: number; progress: number };

/** 保留纺织机存档与网络字段，通用加工逻辑由 ProcessingSystem 负责。 */
export class LoomSystem extends ProcessingSystem<LoomSave> {
  constructor(...args: ConstructorParameters<typeof ProcessingSystem<LoomSave>> extends [unknown, ...infer A] ? A : never) {
    super({
      kind: 'loom', input: 'rope', output: 'cloth',
      inputCount: LOOM_ROPE_PER_CLOTH, outputCount: LOOM_OUTPUT_COUNT, interval: LOOM_INTERVAL,
      create: (scene, position, rotY) => new Loom(scene, position, rotY),
      encode: ({ input, output, ...rest }) => ({ ...rest, rope: input, cloth: output }),
      decode: ({ rope, cloth, ...rest }) => ({ ...rest, input: rope, output: cloth }),
    }, ...args);
  }
  takeRope(...args: Parameters<ProcessingSystem<LoomSave>['takeInput']>): boolean { return this.takeInput(...args); }
  info(...args: Parameters<ProcessingSystem<LoomSave>['nearbyInfo']>): LoomInfo | null {
    const state = super.nearbyInfo(...args);
    return state ? { rope: state.input, cloth: state.output, progress: state.progress } : null;
  }
}
