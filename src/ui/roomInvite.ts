import { writeClipboardText } from '@/platform/compat';
import QRCode from 'qrcode';
import { CONNECTION_LABELS, type ConnectionMode } from '@/game/net/ConnectionMode';
import { roomConnectionMode } from '@/game/net/RoomCode';

const WEB_GAME_URL = 'https://870751720.github.io/island/';

export function buildWebInviteUrl(roomCode = ''): string {
  const url = new URL(WEB_GAME_URL);
  if (roomConnectionMode(roomCode)) url.searchParams.set('room', roomCode);
  return url.toString();
}

/** 非 HTTP 包入口使用公开网页版，避免分享本机文件或容器内部地址。 */
export function buildInviteUrl(roomCode: string, mode: ConnectionMode = 'direct'): string {
  const url = new URL(/^https?:$/.test(window.location.protocol) ? window.location.href : WEB_GAME_URL);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', roomCode);
  if (mode === 'relay') url.searchParams.set('connection', mode);
  return url.toString();
}

/** 邀请链接的二维码 data URL */
export function buildInviteQr(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 220, margin: 1, errorCorrectionLevel: 'M' });
}

/** 邀请分享:优先系统分享面板,无则复制到剪贴板;返回提示文案(无需提示时为 null)。 */
export async function shareRoomInvite(roomCode: string, url: string): Promise<string | null> {
  const mode = roomConnectionMode(roomCode) ?? 'direct';
  const text = `来《去你的岛》和我一起玩！${CONNECTION_LABELS[mode]} · 房间码：${roomCode}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: '去你的岛联机邀请', text, url });
      return null;
    }
    await writeClipboardText(`${text}\n${url}`);
    return '邀请链接已复制';
  } catch {
    // 用户取消分享时不改变房间状态。
    return null;
  }
}
