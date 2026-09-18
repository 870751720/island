import type { GameMode } from './GameMode';
import type { HandTool } from './entities/Player';
import type { NetGuest } from './net/NetGuest';
import type { NetHost } from './net/NetHost';
import type { ResourceKind } from './systems/Inventory';
import type { SaveData } from './systems/SaveSystem';

/** Game 构造选项:联机时由 UI 传入网络会话与种子/初始存档 */
export type GameOptions = {
  host?: NetHost;
  guest?: NetGuest;
  seeds?: { terrainSeed: number };
  save?: SaveData | null;
  gameMode?: GameMode;
  companionKind?: import('./companions/CompanionDefinition').CompanionKind;
  onCompanionReward?: (kind: ResourceKind, x: number, y: number) => void;
};

import type { FacilityKind } from './systems/Facilities';

export type CycleEntry = { tool: HandTool; kind: FacilityKind | null };

export type InteractionKind =
  | 'collect' | 'milk' | 'crafting' | 'eating' | 'fishing' | 'archery' | 'sword'
  | 'lasso' | 'water' | 'workbench' | 'campfire' | 'crates' | 'baitBarrels'
  | 'brewBarrels' | 'waterPurifiers' | 'doghouses' | 'burrows' | 'smelters' | 'cookingStations'
  | 'looms' | 'mills' | 'fences' | 'beds' | 'shrines' | 'plankPaths' | 'gravelPaths' | 'soils' | 'crops' | 'autoPlace';
