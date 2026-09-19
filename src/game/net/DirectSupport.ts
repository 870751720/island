export const DIRECT_UNAVAILABLE = '当前运行环境不支持好友直连，请在手机浏览器中打开网页版后重试。';

export function requireDirectSupport(): void {
  if (typeof globalThis.RTCPeerConnection !== 'function') throw new Error(DIRECT_UNAVAILABLE);
}
