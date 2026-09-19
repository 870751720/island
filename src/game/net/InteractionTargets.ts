/** 这些动作必须携带玩家当时选中的实体，不能到达房主后再改选附近对象。 */
export const INTERACTION_TARGETS: Readonly<Record<string, string>> = {
  crateStore: 'crates', crateTake: 'crates',
  baitBarrelFeed: 'baitBarrels', baitBarrelCollect: 'baitBarrels', baitBarrelTakeFoods: 'baitBarrels',
  brewBarrelFeed: 'brewBarrels', brewBarrelCollect: 'brewBarrels', brewBarrelTakeRaw: 'brewBarrels',
  smelterFeed: 'smelters', smelterAddFuel: 'smelters', smelterCollect: 'smelters', smelterTakeOre: 'smelters',
  cookingAddFuel: 'cookingStations', cookingBoil: 'cookingStations', cookingCollect: 'cookingStations', cookingTakeBoil: 'cookingStations',
  loomFeed: 'looms', loomCollect: 'looms', loomTakeRope: 'looms',
  millFeed: 'mills', millCollect: 'mills', millTakeWheat: 'mills',
  campfireAddFuel: 'campfire', sleep: 'beds', pickupDrop: 'drops', researchStart: 'researchTables',
};
