import { CLOUD_CODE_KEY, normalizeCode } from '../../../shared/cloudSave';

let remembered = '';
export function loadCloudCode(): string {
  try { remembered = normalizeCode(localStorage.getItem(CLOUD_CODE_KEY) ?? ''); }
  catch { /* Missing or unavailable storage uses this session's code. */ }
  return remembered;
}

export function rememberCloudCode(code: string): void {
  remembered = normalizeCode(code);
  try { localStorage.setItem(CLOUD_CODE_KEY, remembered); }
  catch { throw new Error('本机无法记住存档码，请允许本地存储后重试。'); }
}
