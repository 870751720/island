/** 快捷表情清单:选择面板、联机白名单校验与头顶气泡绘制三方共用。
 * 字形本身就是线上 ID,按整串精确匹配;增删表情需两端版本一致(不兼容时升协议版本)。 */
export interface EmojiDef {
  glyph: string;
  name: string;
}

export const EMOJIS: readonly EmojiDef[] = [
  { glyph: '😍', name: '喜爱' },
  { glyph: '😭', name: '大哭' },
  { glyph: '😡', name: '生气' },
  { glyph: '😱', name: '惊吓' },
];

export const EMOJI_GLYPHS: ReadonlySet<string> = new Set(EMOJIS.map((e) => e.glyph));
