import type { SaveData } from '../systems/SaveSystem';
import type { HudSnapshot } from '../Game';

/** 一名玩家的实时姿态与个人状态(快照用) */
export type PlayerState = {
  id: string;
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
};

/** 一只动物的实时姿态(快照用) */
export type AnimalPose = { id: number; x: number; z: number; h: number; alive: boolean };

/** 联机消息(客人→房主:hello/input/action;房主→客人:welcome/start/players/animals/world/hud) */
export type NetMsg =
  | { t: 'hello'; name: string }
  | {
      t: 'welcome';
      seeds: { terrainSeed: number; propsSeed: number };
      state: SaveData;
      /** 当前玩家顺序与稳定 id，顺序对应 state 的本地玩家及 others。 */
      roster: string[];
      you: string;
    }
  | { t: 'start' }
  | { t: 'input'; x: number; z: number }
  | { t: 'action'; name: string; args: unknown[] }
  | { t: 'players'; time: number; day: number; weather: 'sunny' | 'rain'; list: PlayerState[] }
  | { t: 'animals'; list: AnimalPose[] }
  | { t: 'world'; state: SaveData }
  | { t: 'hud'; snap: HudSnapshot };
