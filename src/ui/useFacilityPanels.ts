import type { HudSnapshot } from '@/game/GameContracts';
import { useCallback, useEffect, useState } from 'react';

export type FacilityPanelKey =
  | 'workbench'
  | 'campfire'
  | 'crate'
  | 'baitBarrel'
  | 'brewBarrel'
  | 'smelter'
  | 'cookingStation'
  | 'loom';

type FacilityPanels = Record<FacilityPanelKey, boolean>;

const CLOSED_PANELS: FacilityPanels = {
  workbench: false,
  campfire: false,
  crate: false,
  baitBarrel: false,
  brewBarrel: false,
  smelter: false,
  cookingStation: false,
  loom: false,
};

type FacilityProximity = Pick<
  HudSnapshot,
  | 'dead'
  | 'nearWorkbench'
  | 'nearCampfire'
  | 'nearCrate'
  | 'nearBaitBarrel'
  | 'nearBrewBarrel'
  | 'nearSmelter'
  | 'nearCookingStation'
  | 'nearLoom'
>;

/** 统一管理设施面板，并在玩家离开对应设施或死亡时清理打开状态。 */
export function useFacilityPanels(hud: FacilityProximity) {
  const [panels, setPanels] = useState<FacilityPanels>(CLOSED_PANELS);

  const openPanel = useCallback((panel: FacilityPanelKey) => {
    setPanels((current) => (current[panel] ? current : { ...current, [panel]: true }));
  }, []);

  const closePanel = useCallback((panel: FacilityPanelKey) => {
    setPanels((current) => (current[panel] ? { ...current, [panel]: false } : current));
  }, []);

  useEffect(() => {
    setPanels((current) => {
      const next: FacilityPanels = {
        workbench: current.workbench && hud.nearWorkbench,
        campfire: current.campfire && hud.nearCampfire,
        crate: current.crate && hud.nearCrate,
        baitBarrel: current.baitBarrel && hud.nearBaitBarrel,
        brewBarrel: current.brewBarrel && hud.nearBrewBarrel,
        smelter: current.smelter && hud.nearSmelter,
        cookingStation: current.cookingStation && hud.nearCookingStation,
        loom: current.loom && hud.nearLoom,
      };

      if (hud.dead) return Object.values(current).some(Boolean) ? CLOSED_PANELS : current;
      return (Object.keys(next) as FacilityPanelKey[]).some((key) => next[key] !== current[key])
        ? next
        : current;
    });
  }, [
    hud.dead,
    hud.nearWorkbench,
    hud.nearCampfire,
    hud.nearCrate,
    hud.nearBaitBarrel,
    hud.nearBrewBarrel,
    hud.nearSmelter,
    hud.nearCookingStation,
    hud.nearLoom,
  ]);

  return { panels, openPanel, closePanel };
}
