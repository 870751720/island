import { CLOUD_CODE_KEY, normalizeCode } from '../../../shared/cloudSave';
import type { SaveData } from '../systems/SaveSystem';
import { CloudSaveMissingError, downloadCloud } from './CloudApi';
import { loadCloudCode } from './CloudCode';
import { captureBundle, decodeBundle, restoreBundle, type SaveBundle } from './SaveBundle';

/** Only a confirmed 404 is an empty cloud slot; connectivity/validation errors must stop selection. */
export async function findStartingCloudSave(code: string): Promise<SaveBundle | null> {
  try { return decodeBundle(await downloadCloud(normalizeCode(code))); }
  catch (error) {
    if (error instanceof CloudSaveMissingError) return null;
    throw error;
  }
}

export function restoreStartingCloudSave(code: string, bundle: SaveBundle): void {
  if (bundle.entries[CLOUD_CODE_KEY] !== normalizeCode(code)) throw new Error('云档的存档码不匹配，本地数据未改动。');
  restoreBundle(bundle);
}

/** Capture the new world's initial snapshot without changing the normal local autosave schedule.
 * Guests omit worldSave and back up only their own pre-existing local data.
 */
export function captureStartingCloudSave(code: string, worldSave?: SaveData): string {
  if (loadCloudCode() !== code) throw new Error('本地存档码已变化，请返回主界面确认后再上传。');
  const bundle = captureBundle();
  if (worldSave) bundle.entries['island.save.v1'] = JSON.stringify(worldSave);
  return JSON.stringify(decodeBundle(JSON.stringify(bundle)));
}
