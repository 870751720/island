type Callbacks<T> = { success: (result: T) => void; fail: (error: unknown) => void };
type Archive = { uuid: string; fileId: string; name: string; modifiedTime: number };
type Upload = {
  archiveMetaData: { name: string; summary: string };
  archiveFilePath: string;
};
type Cloud = {
  getArchiveList(options: Callbacks<{ saves: Archive[] }>): void;
  getArchiveData(options: { archiveUUID: string; archiveFileId: string } & Callbacks<{ filePath: string }>): void;
  createArchive(options: Upload & Callbacks<{ uuid: string; fileId: string }>): void;
  updateArchive(options: Upload & { archiveUUID: string } & Callbacks<{ uuid: string; fileId: string }>): void;
};
type FileSystem = {
  writeFile(options: { filePath: string; data: string; encoding: 'utf8' } & Callbacks<unknown>): void;
  readFile(options: { filePath: string; encoding: 'utf8' } & Callbacks<{ data: string }>): void;
};
type Tap = { env: { USER_DATA_PATH: string }; getCloudSaveManager(): Cloud; getFileSystemManager(): FileSystem };

const SLOT = 'island_manual_save';
const COOLDOWN_KEY = 'island.taptap.manualUploadAt';
const UPLOAD_INTERVAL = 65_000;
let lastAttempt = 0;
let busy = false;

function request<T>(invoke: (callbacks: Callbacks<T>) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('请求超时，未能确认操作完成。请稍后重试。')), 30_000);
    try {
      invoke({
        success: value => { clearTimeout(timer); resolve(value); },
        fail: error => { clearTimeout(timer); reject(error); },
      });
    } catch (error) { clearTimeout(timer); reject(error); }
  });
}

function connect(): { cloud: Cloud; files: FileSystem; directory: string } {
  const tap = (globalThis as typeof globalThis & { tap?: Tap }).tap;
  if (!tap?.getCloudSaveManager || !tap.getFileSystemManager || !tap.env?.USER_DATA_PATH) {
    throw new Error('请在支持云存档的 TapTap 客户端中使用此功能；普通浏览器仅支持本地存档。');
  }
  return { cloud: tap.getCloudSaveManager(), files: tap.getFileSystemManager(), directory: tap.env.USER_DATA_PATH };
}

async function archive(cloud: Cloud): Promise<Archive | undefined> {
  const result = await request<{ saves: Archive[] }>(callbacks => cloud.getArchiveList(callbacks));
  if (!Array.isArray(result.saves)) throw new Error('未能读取云存档列表，请稍后重试。');
  const match = result.saves.filter(save => save.name === SLOT).sort((a, b) => b.modifiedTime - a.modifiedTime)[0];
  if (match && (!match.uuid || !match.fileId || !Number.isFinite(match.modifiedTime))) {
    throw new Error('云存档信息不完整，请稍后重试。');
  }
  return match;
}

async function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  if (busy) throw new Error('正在处理存档，请等待当前操作结束。');
  busy = true;
  try { return await operation(); } finally { busy = false; }
}

export function uploadCloud(text: string, summary: string): Promise<void> {
  return exclusive(async () => {
    const { cloud, files, directory } = connect();
    const existing = await archive(cloud);
    let storedAttempt = 0;
    try { storedAttempt = Number(localStorage.getItem(COOLDOWN_KEY)) || 0; } catch { /* 以内存与平台时间限流。 */ }
    const since = Math.max(lastAttempt, storedAttempt, (existing?.modifiedTime ?? 0) * 1000);
    const remaining = Math.ceil((since + UPLOAD_INTERVAL - Date.now()) / 1000);
    if (remaining > 0) throw new Error(`上传较频繁，请 ${remaining} 秒后再试。`);
    const filePath = `${directory}/${SLOT}.json`;
    await request(callbacks => files.writeFile({ filePath, data: text, encoding: 'utf8', ...callbacks }));
    lastAttempt = Date.now();
    try { localStorage.setItem(COOLDOWN_KEY, String(lastAttempt)); } catch { /* 不阻止云端保存。 */ }
    const options = { archiveMetaData: { name: SLOT, summary }, archiveFilePath: filePath };
    await request<{ uuid: string; fileId: string }>(callbacks => {
      if (existing) cloud.updateArchive({ ...options, archiveUUID: existing.uuid, ...callbacks });
      else cloud.createArchive({ ...options, ...callbacks });
    });
  });
}

export function downloadCloud(): Promise<string> {
  return exclusive(async () => {
    const { cloud, files } = connect();
    const existing = await archive(cloud);
    if (!existing) throw new Error('还没有手动上传的云存档。请先在有进度的设备上上传。');
    const file = await request<{ filePath: string }>(callbacks => cloud.getArchiveData({
      archiveUUID: existing.uuid, archiveFileId: existing.fileId, ...callbacks,
    }));
    const result = await request<{ data: string }>(callbacks => files.readFile({ filePath: file.filePath, encoding: 'utf8', ...callbacks }));
    if (typeof result.data !== 'string') throw new Error('云存档内容无法读取，本地数据未改动。');
    return result.data;
  });
}

export function cloudError(error: unknown): string {
  if (error instanceof Error) return error.message;
  const code = (error as { errno?: number } | null)?.errno;
  if (code === 400001) return 'TapTap 每分钟最多上传一次，请稍后重试。';
  if (code === 400100) return 'TapTap 云存档尚未就绪，请确认已登录并更新客户端后重试。';
  if (code === 400000) return '存档大小超过平台限制，上传未完成。';
  return `云存档操作失败，请检查网络后重试${code ? `（错误码 ${code}）` : ''}。`;
}
