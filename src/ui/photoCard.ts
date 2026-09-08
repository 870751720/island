import QRCode from 'qrcode';
import { GAME_URL, GAME_TITLE } from './shareCard';

/** 照片分享卡文案池:{day} 会被替换为当天生存天数,每次拍照随机取一条 */
const CAPTIONS = [
  '荒岛第{day}天,今日份风景已签收',
  '在荒岛当岛主的第{day}天',
  '第{day}天,还活着,值得拍一张',
  '别人的诗和远方,我的树和海浪',
  '这里没有Wi-Fi,但海风免费',
  '我的小岛,风是甜的',
  '面朝大海,第{day}天依然没花开',
  '一座岛,一个人,一整个黄昏',
  '今日营业:岛景无限量供应',
  '搬来荒岛的第{day}天,不后悔',
  '你们卷吧,我在岛上躺平',
  '人间值得,荒岛也是',
  '第{day}天,终于学会和自己相处',
  '承包整片海的感觉,了解一下',
  '这构图,大自然自己修的图',
  '不用滤镜,荒岛自带高级感',
  '把日子过成度假,第{day}天打卡',
  '岛上信号不好,快乐管够',
  '收集日出日落第{day}天',
  '谁说荒岛求生不能是写真之旅',
  '此处省略一万字,只剩海浪声',
  '第{day}天,我和这座岛处成了朋友',
  '退潮见真心,涨潮见胸怀',
  '在城市加班的你们,看不到这个',
  '一座岛住久了,哪里都是风景',
  '荒岛日记第{day}页:晴,心也晴',
  '免费海景房,永久产权',
  '别问,问就是岛主很忙',
  '第{day}天,影子都比我有故事',
  '我在岛上等风,也等你来',
  '这里的每一块石头我都认识',
  '把烦恼扔进海里,第{day}天生效',
  '生活不止眼前的苟且,还有岛和远方的礁石',
  '手机没电了风景还在,第{day}天',
  '全岛唯一摄影师的作品展',
  '今天的海,比昨天蓝一点',
  '第{day}天,我给这座岛打了五星',
  '世界很大,我的岛刚刚好',
  '日落是荒岛每天发的工资',
  '扫码上岛,下一个岛主就是你',
];

/** 随机取一条文案并填入当天生存天数 */
export function randomPhotoCaption(day: number): string {
  const raw = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
  return raw.replace('{day}', String(day));
}

/** 分享面板附带的文字 */
export function photoShareText(caption: string): string {
  return `《${GAME_TITLE}》${caption} ${GAME_URL}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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

const CARD_W = 750;
const CREAM = '#f2efe4';

/**
 * 绘制照片分享卡(竖版 PNG):拍照画面为底,
 * 顶部游戏名水印、底部渐晕 + 随机文案 + 生存天数 + 引流二维码。
 */
export async function renderPhotoCard(
  scene: string,
  caption: string,
  day: number
): Promise<Blob> {
  const img = await loadImage(scene);
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = Math.round((CARD_W * img.height) / img.width);
  const ctx = canvas.getContext('2d')!;
  const H = canvas.height;

  ctx.drawImage(img, 0, 0, CARD_W, H);

  // 底部渐晕,保证文案与二维码可读
  const shade = ctx.createLinearGradient(0, H, 0, H - 340);
  shade.addColorStop(0, 'rgba(12, 20, 15, 0.88)');
  shade.addColorStop(1, 'rgba(12, 20, 15, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, H - 340, CARD_W, 340);
  // 顶部轻微压暗,衬托标题水印
  const top = ctx.createLinearGradient(0, 0, 0, 150);
  top.addColorStop(0, 'rgba(12, 20, 15, 0.45)');
  top.addColorStop(1, 'rgba(12, 20, 15, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, CARD_W, 150);

  // 顶部水印:游戏名 + 生存天数
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CREAM;
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(GAME_TITLE, 48, 60);
  ctx.font = '26px sans-serif';
  ctx.fillStyle = 'rgba(242, 239, 228, 0.8)';
  ctx.fillText(`荒岛生存 · 第 ${day} 天`, 48, 108);

  // 底部:文案 + 二维码
  const qr = await QRCode.toDataURL(GAME_URL, { width: 320, margin: 1, color: { dark: '#1c2a20', light: CREAM } });
  const qrImg = await loadImage(qr);
  const qrSize = 150;
  const qrX = CARD_W - qrSize - 44;
  const qrY = H - qrSize - 48;
  ctx.fillStyle = CREAM;
  roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 14);
  ctx.fill();
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = CREAM;
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(caption, 44, qrY + qrSize / 2 - 24);
  ctx.font = '26px sans-serif';
  ctx.fillStyle = 'rgba(242, 239, 228, 0.75)';
  ctx.fillText('扫码上岛,你也能活几天', 44, qrY + qrSize / 2 + 30);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png')
  );
}

/** 文件形式的系统分享;不支持时返回 false 由调用方降级提示长按保存 */
export async function sharePhotoCard(blob: Blob, caption: string): Promise<boolean> {
  const file = new File([blob], 'island-photo.png', { type: 'image/png' });
  const payload = { files: [file], title: GAME_TITLE, text: photoShareText(caption) };
  try {
    if (navigator.canShare?.(payload)) {
      await navigator.share(payload);
      return true;
    }
  } catch {
    // 用户取消分享视为已完成
    return true;
  }
  return false;
}
