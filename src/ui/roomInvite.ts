import QRCode from 'qrcode';

/** 房间码邀请链接(当前页地址带上 ?room=xxxxx) */
export function buildInviteUrl(roomCode: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', roomCode);
  return url.toString();
}

/** 邀请链接的二维码 data URL */
export function buildInviteQr(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 220, margin: 1, errorCorrectionLevel: 'M' });
}

/** 邀请分享:优先系统分享面板,无则复制到剪贴板;返回提示文案(无需提示时为 null)。 */
export async function shareRoomInvite(roomCode: string, url: string): Promise<string | null> {
  const text = `来《去你的岛》和我一起玩！房间码：${roomCode}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: '去你的岛联机邀请', text, url });
      return null;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return '邀请链接已复制';
  } catch {
    // 用户取消分享时不改变房间状态。
    return null;
  }
}
