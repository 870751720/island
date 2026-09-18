/** 1 号「轻柔落土」的确定性波形；播种缩短包络，保留落土音色。 */
export function placementWave(seed: boolean): Float32Array {
  const rate = 44100;
  const scale = seed ? 0.55 : 1;
  const samples = new Float32Array(Math.ceil(rate * 0.215 * scale));
  let randomState = 7219;
  for (const layer of [
    { start: 0, length: .18, frequency: 150, endFrequency: 65, gain: .7, noise: .35 },
    { start: .055, length: .16, frequency: 900, endFrequency: 900, gain: .14, noise: 1 },
  ]) {
    let phase = 0;
    let filteredNoise = 0;
    const length = layer.length * scale;
    for (let i = 0; i < Math.floor(length * rate); i++) {
      const time = i / rate;
      const progress = time / length;
      phase += 2 * Math.PI * (layer.frequency + (layer.endFrequency - layer.frequency) * progress) / rate;
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      filteredNoise += .38 * (randomState / 2147483648 - 1 - filteredNoise);
      const envelope = Math.min(1, time / .002) * Math.exp(-6 * progress) * Math.min(1, (length - time) / .015);
      samples[Math.round(layer.start * scale * rate) + i] += layer.gain * envelope * ((1 - layer.noise) * Math.sin(phase) + layer.noise * filteredNoise);
    }
  }
  const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  return samples.map(value => value / peak * .7);
}

/** 每个音频上下文只合成一次；过密播种不排队补播。 */
export class PlacementSound {
  private buffers = new Map<boolean, AudioBuffer>();
  private lastSeedAt = -Infinity;

  constructor(private ctx: AudioContext, private dest: AudioNode) {}

  play(seed: boolean, volume: number): void {
    const now = this.ctx.currentTime;
    if (seed && now - this.lastSeedAt < .12) return;
    if (seed) this.lastSeedAt = now;
    let buffer = this.buffers.get(seed);
    if (!buffer) {
      const samples = placementWave(seed);
      buffer = this.ctx.createBuffer(1, samples.length, 44100);
      buffer.getChannelData(0).set(samples);
      this.buffers.set(seed, buffer);
    }
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.dest);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(now);
  }
}
