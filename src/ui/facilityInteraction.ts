import type { HudSnapshot } from '@/game/GameContracts';

type FacilityProximity = Pick<
  HudSnapshot,
  | 'nearWorkbench'
  | 'nearCampfire'
  | 'campfireInfo'
  | 'nearCrate'
  | 'nearBaitBarrel'
  | 'nearBrewBarrel'
  | 'nearSmelter'
  | 'nearCookingStation'
  | 'nearLoom'
  | 'nearMill'
  | 'nearBed'
>;

type FacilityKey = Exclude<keyof FacilityProximity, 'campfireInfo'>;

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
  { key: 'nearMill', diggable: true },
  { key: 'nearBed', diggable: true },
];

/** 面前设施是否让出铲子按钮；火堆仅在熄灭后允许回收。 */
export function isNearbyFacilityDiggable(proximity: FacilityProximity): boolean {
  const facility = FACILITY_PRIORITY.find(({ key }) => proximity[key]);
  if (facility?.key === 'nearCampfire') return proximity.campfireInfo?.lit === false;
  return facility?.diggable ?? false;
}
