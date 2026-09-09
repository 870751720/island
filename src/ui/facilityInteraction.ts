import type { HudSnapshot } from '@/game/GameContracts';

type FacilityProximity = Pick<
  HudSnapshot,
  | 'nearWorkbench'
  | 'nearCampfire'
  | 'nearCrate'
  | 'nearBaitBarrel'
  | 'nearBrewBarrel'
  | 'nearSmelter'
  | 'nearCookingStation'
  | 'nearLoom'
  | 'nearBed'
>;

type FacilityKey = keyof FacilityProximity;

/** 顺序同时定义多个设施重叠时的交互优先级。 */
const FACILITY_PRIORITY: readonly { key: FacilityKey; diggable: boolean }[] = [
  { key: 'nearWorkbench', diggable: true },
  { key: 'nearCampfire', diggable: false },
  { key: 'nearCrate', diggable: true },
  { key: 'nearBaitBarrel', diggable: true },
  { key: 'nearBrewBarrel', diggable: true },
  { key: 'nearSmelter', diggable: true },
  { key: 'nearCookingStation', diggable: true },
  { key: 'nearLoom', diggable: true },
  { key: 'nearBed', diggable: true },
];

/** 面前劫持按钮的设施是否可被铲子挖走；火堆目前不可挖。 */
export function isNearbyFacilityDiggable(proximity: FacilityProximity): boolean {
  return FACILITY_PRIORITY.find(({ key }) => proximity[key])?.diggable ?? false;
}
