import { MAX_BYTES, normalizeCode } from '../../../shared/cloudSave';

const endpoint = `${(process.env.NEXT_PUBLIC_CLOUD_API_URL || 'https://43.110.116.98').replace(/\/$/, '')}/api/save`;

async function request(code: string, body?: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(endpoint, {
      method: body === undefined ? 'GET' : 'PUT',
      headers: { Authorization: `SaveCode ${encodeURIComponent(normalizeCode(code))}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body, signal: controller.signal, credentials: 'omit', cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) {
      if (response.status === 404) throw new Error('该存档码还没有云档，请检查存档码，或先在有进度的设备上传。');
      if (response.status === 429) throw new Error('操作太频繁，请稍后重试。');
      if (response.status === 413) throw new Error('存档超过 10 MiB，上传未完成。');
      throw new Error('云存档服务暂时不可用，请稍后重试。');
    }
    const reader = response.body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) { await reader.cancel(); throw new Error('云档超过大小限制，本地数据未改动。'); }
      chunks.push(value);
    }
    const merged = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder().decode(merged);
  } catch (error) {
    if (controller.signal.aborted) throw new Error('请求超时，未能确认操作完成，请稍后重试。');
    if (error instanceof TypeError) throw new Error('无法连接云存档服务，请检查网络后重试。');
    throw error;
  } finally { clearTimeout(timer); }
}

export async function uploadCloud(code: string, text: string): Promise<void> { await request(code, text); }
export function downloadCloud(code: string): Promise<string> { return request(code); }
export function cloudError(error: unknown): string {
  return error instanceof Error ? error.message : '云存档操作失败，请稍后重试。';
}
