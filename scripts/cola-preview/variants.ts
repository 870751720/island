export type CatStyle = {
  name: string;
  note: string;
  head: [number, number, number];
  body: [number, number, number];
  eye: number;
  ears: number;
  gray: string;
  white: string;
  fluff: boolean;
  smile: boolean;
};

export const variants: readonly CatStyle[] = [
  { name: 'A · 棉花糖', note: '宽宽的包子脸、豆豆眉、玻璃珠大眼，安静乖巧', head: [.55,.43,.36], body: [.32,.30,.57], eye: .135, ears: .22, gray: '#737583', white: '#fff4e5', fluff: false, smile: false },
  { name: 'B · 元气可乐', note: '桃心小脸、舒展猫耳、开心小嘴，灵动又亲人', head: [.47,.46,.35], body: [.29,.29,.61], eye: .126, ears: .32, gray: '#646b80', white: '#fff5e9', fluff: false, smile: true },
  { name: 'C · 云朵小狮子', note: '蓬松双颊、奶油围脖、明亮圆眼，毛绒玩偶感', head: [.53,.45,.37], body: [.34,.32,.57], eye: .12, ears: .25, gray: '#797581', white: '#fff1df', fluff: true, smile: true },
];
