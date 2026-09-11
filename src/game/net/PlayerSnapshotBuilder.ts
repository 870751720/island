import type { PlayerSession } from '../mp/PlayerSession';
import type { PlayerState } from './Protocol';
import type { ResourceKind } from '../systems/Inventory';
import type { FacilityKind } from '../systems/Facilities';
import type { DayNightSystem } from '../systems/DayNightSystem';
import type { WeatherSystem } from '../systems/WeatherSystem';

/** Builds the host-authoritative player/environment payload sent on the pose channel. */
export function buildPlayersState(
  sessions: readonly PlayerSession[],
  dayNight: DayNightSystem,
  weather: WeatherSystem,
  heldPlaceItem: (session: PlayerSession) => FacilityKind | null
) {
  const wind = weather.wind;
  return {
    time: dayNight.time,
    day: dayNight.day,
    weather:
      weather.rainIntensity > 0.05 ? 'rain' as const
      : weather.snowIntensity > 0.05 ? 'snow' as const
      : weather.windIntensity > 0.05 ? 'wind' as const
      : 'sunny' as const,
    rain: weather.rainIntensity,
    snow: weather.snowIntensity,
    windAmount: weather.windIntensity,
    windDirX: wind.dirX,
    windDirZ: wind.dirZ,
    list: sessions.map((session): PlayerState => {
      const position = session.player.group.position;
      const survival = session.survival.state;
      return {
        id: session.id,
        name: session.name,
        x: position.x,
        y: position.y,
        z: position.z,
        rotY: session.player.group.rotation.y,
        tool: session.player.currentTool as string,
        placeKind: heldPlaceItem(session),
        toolTier: (session.tools as Record<string, number>)[session.player.currentTool],
        hunger: survival.hunger,
        thirst: survival.thirst,
        health: survival.health,
        stamina: survival.stamina,
        equipped: session.equipment.snapshot(),
        gender: session.player.currentGender,
        dead: survival.dead,
        action: session.player.currentAction,
        refresh: Math.round(session.player.refreshSeconds),
        tipsy: Math.round(session.player.tipsySeconds),
      };
    }),
  };
}
