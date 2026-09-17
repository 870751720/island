export type DeviceType = 'desktop' | 'mobile';

export interface DeviceSignals {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  mobile?: boolean;
}

/** 手机和平板统一归为 mobile；不依赖窗口尺寸，避免横屏或电脑缩窗改变分类。 */
export function getDeviceType(signals?: DeviceSignals): DeviceType {
  if (!signals) {
    if (typeof navigator === 'undefined') return 'desktop';
    const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
    signals = {
      userAgent: nav.userAgent,
      platform: nav.platform,
      maxTouchPoints: nav.maxTouchPoints,
      mobile: nav.userAgentData?.mobile,
    };
  }
  if (signals.mobile === true || /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(signals.userAgent)) {
    return 'mobile';
  }
  // iPadOS 的桌面 UA 与 Mac 相同，但支持多点触摸。
  if (/Mac/i.test(signals.platform) && signals.maxTouchPoints > 1) return 'mobile';
  return 'desktop';
}

export function isMobileDevice(): boolean {
  return getDeviceType() === 'mobile';
}
