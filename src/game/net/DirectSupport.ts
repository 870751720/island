export const DIRECT_UNAVAILABLE = '当前运行环境不支持好友直连，请在手机浏览器中打开网页版后重试。';

export function supportsDirectConnection(): boolean {
  return process.env.NEXT_PUBLIC_XHS_EXPORT !== '1' && typeof globalThis.RTCPeerConnection === 'function';
}

export function requireDirectSupport(): void {
  if (!supportsDirectConnection()) throw new Error(DIRECT_UNAVAILABLE);
}
