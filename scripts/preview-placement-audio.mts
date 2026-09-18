import fs from 'node:fs';
import path from 'node:path';

/** 离线合成试听；未选定的候选音不进入游戏包。 */
const rate = 44100;
const output = path.resolve('dist/placement-audio');
fs.mkdirSync(output, { recursive: true });
type Layer = { start?: number; length: number; frequency: number; endFrequency?: number; gain: number; noise?: number };
const choices: { name: string; layers: Layer[] }[] = [
  { name: '1-soft-soil', layers: [
    { length: .18, frequency: 150, endFrequency: 65, gain: .7, noise: .35 },
    { start: .055, length: .16, frequency: 900, gain: .14, noise: 1 },
  ] },
  { name: '2-wood-tap', layers: [
    { length: .13, frequency: 620, endFrequency: 350, gain: .55, noise: .12 },
    { length: .2, frequency: 190, endFrequency: 140, gain: .4 },
  ] },
  { name: '3-round-pop', layers: [
    { length: .16, frequency: 620, endFrequency: 120, gain: .85 },
  ] },
  { name: '4-stone-set', layers: [
    { length: .22, frequency: 110, endFrequency: 65, gain: .65, noise: .2 },
    { length: .07, frequency: 1800, endFrequency: 1300, gain: .3, noise: .5 },
  ] },
  { name: '5-gentle-chime', layers: [
    { length: .12, frequency: 200, endFrequency: 95, gain: .5, noise: .1 },
    { start: .035, length: .3, frequency: 880, gain: .28 },
    { start: .075, length: .28, frequency: 1320, gain: .19 },
  ] },
];

for (const choice of choices) {
  const samples = new Float64Array(Math.ceil(rate * .65));
  let randomState = 7219;
  for (const layer of choice.layers) {
    let phase = 0;
    let filteredNoise = 0;
    for (let i = 0; i < Math.floor(layer.length * rate); i++) {
      const time = i / rate;
      const progress = time / layer.length;
      const frequency = layer.frequency + ((layer.endFrequency ?? layer.frequency) - layer.frequency) * progress;
      phase += 2 * Math.PI * frequency / rate;
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      filteredNoise += .38 * (randomState / 2147483648 - 1 - filteredNoise);
      const noise = layer.noise ?? 0;
      const envelope = Math.min(1, time / .002) * Math.exp(-6 * progress) * Math.min(1, (layer.length - time) / .015);
      samples[Math.round((layer.start ?? 0) * rate) + i] += layer.gain * envelope * ((1 - noise) * Math.sin(phase) + noise * filteredNoise);
    }
  }
  const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((value, i) => wav.writeInt16LE(Math.round(value / peak * .7 * 32767), 44 + i * 2));
  fs.writeFileSync(path.join(output, `${choice.name}.wav`), wav);
}
console.log('Generated 5 placement audio previews.');
