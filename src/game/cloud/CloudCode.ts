import { CLOUD_CODE_KEY, normalizeCode } from '../../../shared/cloudSave';

export function loadCloudCode(): string {
  try { return normalizeCode(localStorage.getItem(CLOUD_CODE_KEY) ?? ''); }
  catch { return ''; }
}

export function rememberCloudCode(code: string): void {
  const normalized = normalizeCode(code);
  try {
    localStorage.setItem(CLOUD_CODE_KEY, normalized);
    if (localStorage.getItem(CLOUD_CODE_KEY) !== normalized) throw new Error('Storage write failed');
  }
  catch { throw new Error('本机无法记住存档码，请允许本地存储后重试。'); }
}
