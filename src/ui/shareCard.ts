import QRCode from 'qrcode';
import type { DeathCause, DeathReport } from '@/game/systems/RunStats';

/** 线上试玩地址(卡片二维码与分享文案都指向这里) */
export const GAME_URL = 'https://870751720.github.io/island/';
const GAME_TITLE = '去你的岛';

/** 各死因的卡片文案 */
const CAUSE_LINES: Record<DeathCause, string> = {
  starve: '饥肠辘辘,倒在了荒岛上',
  thirst: '没能找到淡水,被干渴击倒',
  drown: '体力耗尽,沉入了大海',
  animal: '不敌野兽,葬身兽口',
};

/** 分享/复制用的战绩文案 */
export function deathReportText(report: DeathReport): string {
  return (
    `我在《${GAME_TITLE}》活到了第 ${report.day} 天,${CAUSE_LINES[report.cause]}。` +
    `击杀×${report.kills} 采集×${report.collected} 建造×${report.built} 合成×${report.crafted},` +
    `你能活几天?${GAME_URL}`
  );
}

const CARD_W = 750;
const CARD_H = 1200;
const CREAM = '#f2efe4';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** 绘制战绩分享卡(竖版 PNG):死亡瞬间场景为底,叠深色遮罩与战绩文案/二维码 */
export async function renderDeathCard(report: DeathReport): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  // 底图:死亡瞬间的场景截图(cover 裁切),无截图时退回深绿纯色
  ctx.fillStyle = '#1c2a20';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  if (report.scene) {
    try {
      const img = await loadImage(report.scene);
      const scale = Math.max(CARD_W / img.width, CARD_H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (CARD_W - w) / 2, (CARD_H - h) / 2, w, h);
    } catch {
      // 截图解码失败则保持纯色底
    }
  }

  // 遮罩:上下加深,中段保留场景可读性
  const shade = ctx.createLinearGradient(0, 0, 0, CARD_H);
  shade.addColorStop(0, 'rgba(12, 20, 15, 0.82)');
  shade.addColorStop(0.4, 'rgba(12, 20, 15, 0.45)');
  shade.addColorStop(1, 'rgba(12, 20, 15, 0.9)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = CREAM;
  ctx.font = 'bold 58px sans-serif';
  ctx.fillText(GAME_TITLE, CARD_W / 2, 92);
  ctx.font = '28px sans-serif';
  ctx.fillStyle = 'rgba(242, 239, 228, 0.75)';
  ctx.fillText('荒 岛 生 涯 结 算', CARD_W / 2, 152);

  ctx.fillStyle = CREAM;
  ctx.font = 'bold 120px sans-serif';
  ctx.fillText(`第 ${report.day} 天`, CARD_W / 2, 300);
  ctx.font = '34px sans-serif';
  ctx.fillStyle = '#e8b8a0';
  ctx.fillText(CAUSE_LINES[report.cause], CARD_W / 2, 396);

  // 战绩五项:一行五格
  const stats: [string, number][] = [
    ['击杀', report.kills],
    ['采集', report.collected],
    ['建造', report.built],
    ['合成', report.crafted],
    ['天数', report.day],
  ];
  const boxW = 128;
  const gap = (CARD_W - boxW * 5) / 6;
  const boxY = 480;
  const boxH = 140;
  for (let i = 0; i < stats.length; i++) {
    const x = gap + (boxW + gap) * i;
    ctx.fillStyle = 'rgba(20, 30, 24, 0.66)';
    roundRect(ctx, x, boxY, boxW, boxH, 18);
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText(String(stats[i][1]), x + boxW / 2, boxY + 56);
    ctx.font = '26px sans-serif';
    ctx.fillStyle = 'rgba(242, 239, 228, 0.7)';
    ctx.fillText(stats[i][0], x + boxW / 2, boxY + 104);
  }

  // 底部:二维码 + 引导文案
  const qr = await QRCode.toDataURL(GAME_URL, { width: 360, margin: 1, color: { dark: '#1c2a20', light: CREAM } });
  const qrImg = await loadImage(qr);
  const qrSize = 190;
  const qrX = CARD_W - qrSize - 64;
  const qrY = CARD_H - qrSize - 72;
  ctx.fillStyle = CREAM;
  roundRect(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 16);
  ctx.fill();
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.textAlign = 'left';
  ctx.fillStyle = CREAM;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('你能活几天?', 64, qrY + qrSize / 2 - 26);
  ctx.font = '26px sans-serif';
  ctx.fillStyle = 'rgba(242, 239, 228, 0.7)';
  ctx.fillText('扫码上岛挑战', 64, qrY + qrSize / 2 + 28);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png')
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 文件形式的系统分享(微信/保存图片等);不支持时返回 false 由调用方降级展示 */
export async function shareDeathCard(blob: Blob, report: DeathReport): Promise<boolean> {
  const file = new File([blob], 'island-death.png', { type: 'image/png' });
  const payload = { files: [file], title: GAME_TITLE, text: deathReportText(report) };
  try {
    if (navigator.canShare?.(payload)) {
      await navigator.share(payload);
      return true;
    }
  } catch {
    // 用户取消分享视为已完成,不再降级弹层
    return true;
  }
  return false;
}
