/** 房间码载荷:邀请码(房主的 SDP offer)或回传码(客人的 SDP answer) */
export type RoomPayload = { role: 'invite' | 'answer'; sdp: string };

/** 编码为可复制的房间码(JSON → UTF-8 → base64url) */
export function encodeCode(payload: RoomPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 解码房间码;格式不对时抛错(由 UI 捕获提示) */
export function decodeCode(code: string): RoomPayload {
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  const payload = JSON.parse(new TextDecoder().decode(bytes)) as RoomPayload;
  if (
    (payload.role !== 'invite' && payload.role !== 'answer') ||
    typeof payload.sdp !== 'string'
  ) {
    throw new Error('bad room code');
  }
  return payload;
}
