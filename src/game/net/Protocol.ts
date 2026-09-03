import type { SaveData } from '../systems/SaveSystem';
import type { HudSnapshot } from '../Game';
import type { SfxName } from '../audio/Sfx';
import type { ActionType } from '../entities/Player';
import type { GmConfig } from '../systems/GmSystem';

export const NET_PROTOCOL_VERSION = 6;

/** 一名玩家的实时姿态与个人状态(快照用) */
export type PlayerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  tool: string;
  hunger: number;
  thirst: number;
  health: number;
  stamina: number;
  dead: boolean;
  action: ActionType | null;
};

/** 一只动物的实时姿态(快照用) */
export type AnimalPose = { id: number; x: number; z: number; h: number; alive: boolean };

export type AmbientPose = {
  id: number;
  x: number;
  y: number;
  z: number;
  h: number;
  visible: boolean;
  state?: string;
};

export type AmbientState = {
  crabs: AmbientPose[];
  birds: AmbientPose[];
  butterflies: AmbientPose[];
  dog: AmbientPose;
};

export type WorldPatch = Partial<
  Pick<
    SaveData,
    | 'props'
    | 'campfires'
    | 'workbenches'
    | 'workbenchCrafted'
    | 'crates'
    | 'fences'
    | 'fenceGates'
    | 'beds'
    | 'drops'
  >
>;

export type NetEvent =
  | { kind: 'feedback'; sfx: SfxName; actor: string; x: number; y: number; z: number }
  | { kind: 'collectFx'; x: number; y: number; z: number; color: string; count: number }
  | { kind: 'gm'; config: GmConfig }
  | { kind: 'bottle'; target: string; text: string };

/** 联机消息(客人→房主:hello/input/action;房主→客人:welcome/start/players/animals/world/hud) */
export type NetMsg =
  | { t: 'hello'; name: string; protocol: number; resumeToken?: string }
  | {
      t: 'welcome';
      seeds: { terrainSeed: number; propsSeed: number };
      state: SaveData;
      /** 当前玩家顺序与稳定 id，顺序对应 state 的本地玩家及 others。 */
      roster: string[];
      you: string;
      protocol: number;
      resumeToken: string;
    }
  | { t: 'reject'; reason: string }
  | { t: 'start' }
  | { t: 'input'; x: number; z: number }
  | { t: 'action'; name: string; args: unknown[] }
  | { t: 'players'; time: number; day: number; weather: 'sunny' | 'rain'; list: PlayerState[] }
  | { t: 'animals'; list: AnimalPose[] }
  | { t: 'ambient'; state: AmbientState }
  | { t: 'world'; patch: WorldPatch }
  | { t: 'hud'; snap: HudSnapshot }
  | { t: 'event'; event: NetEvent };
