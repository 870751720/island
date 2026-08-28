/**
 * WebAudio 程序化合成底层工具:供音效与配乐共用的振荡器音、噪声、包络与简易混响。
 * 所有声音均由代码实时合成,不加载任何音频文件。
 */

const NOTE_A4 = 69; // MIDI 音符号:A4 = 440Hz

/** MIDI 音符号转频率 */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - NOTE_A4) / 12);
}

/** 包络参数:起音/衰减时间与音量比例 */
type Envelope = {
  attack: number;
  decay: number;
  peak: number;
};

/**
 * 柔和的「钢琴感」拨弦音:基频正弦 + 八度泛音三角波,
 * 经低通滤波后指数衰减,带轻微双振荡器失谐营造温度感。
 */
export function pianoTone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  time: number,
  duration: number,
  volume: number
): void {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(volume, time + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(freq * 6, 5000);

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = freq;
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.value = freq * 2;
  const g2 = ctx.createGain();
  g2.gain.value = 0.28;
  // 轻微失谐,让音色更「手工」
  osc1.detune.value = (Math.random() - 0.5) * 4;

  osc1.connect(filter);
  osc2.connect(g2).connect(filter);
  filter.connect(env).connect(dest);
  osc1.start(time);
  osc2.start(time);
  osc1.stop(time + duration + 0.05);
  osc2.stop(time + duration + 0.05);
}

/** 通用单音:指定波形与滤波截止频率,指数衰减 */
export function tone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  time: number,
  env: Envelope,
  type: OscillatorType = 'sine',
  endFreq?: number
): void {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(env.peak, time + env.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + env.attack + env.decay);
  if (endFreq !== undefined) {
    gain.gain.setValueAtTime(env.peak, time + env.attack);
  }

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), time + env.attack + env.decay);
  }
  osc.connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + env.attack + env.decay + 0.05);
}

let noiseBufferCache: AudioBuffer | null = null;

/** 共享的白噪声缓冲区(2 秒,循环取用) */
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBufferCache && noiseBufferCache.sampleRate === ctx.sampleRate) return noiseBufferCache;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBufferCache = buffer;
  return buffer;
}

/** 噪声爆发:带通/低通滤波,用于砍击、水花、风等;q 越大滤波越共振,0.0001~20 */
export function noiseBurst(
  ctx: AudioContext,
  dest: AudioNode,
  time: number,
  env: Envelope,
  filterType: BiquadFilterType,
  filterFreq: number,
  endFreq?: number,
  q = 1
): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, time);
  if (endFreq !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), time + env.decay);
  }
  filter.Q.value = q;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(env.peak, time + env.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + env.attack + env.decay);

  src.connect(filter).connect(gain).connect(dest);
  src.start(time);
  src.stop(time + env.attack + env.decay + 0.05);
}

/** 持续循环噪声源(海浪、雨等环境声的底层),返回输出节点供外部调制 */
export function noiseLoop(
  ctx: AudioContext,
  dest: AudioNode,
  filterType: BiquadFilterType,
  filterFreq: number
): { gain: GainNode; filter: BiquadFilterNode; stop: () => void } {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.7;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(filter).connect(gain).connect(dest);
  src.start();
  return {
    gain,
    filter,
    stop: () => {
      src.stop();
      src.disconnect();
    },
  };
}

/**
 * 简易混响:多抽头梳状反馈延迟,轻量且适合手机性能。
 * 所有音乐/音效统一过一遍,营造空旷海岛的空间感。
 */
export function createReverb(ctx: AudioContext): { input: AudioNode; output: AudioNode } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const wet = ctx.createGain();
  wet.gain.value = 0.25;
  input.connect(output);
  input.connect(wet);

  // 三个不同延迟的反馈延迟线叠加,近似小空间混响尾音
  for (const [delaySec, feedback] of [
    [0.09, 0.32],
    [0.13, 0.26],
    [0.21, 0.2],
  ] as const) {
    const delay = ctx.createDelay(1);
    delay.delayTime.value = delaySec;
    const fb = ctx.createGain();
    fb.gain.value = feedback;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2400;
    input.connect(delay);
    delay.connect(damp).connect(fb).connect(delay);
    delay.connect(wet);
  }
  wet.connect(output);
  return { input, output };
}
