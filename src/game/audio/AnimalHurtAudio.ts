/** 带通共鸣腔；输入为声门闭合脉冲，输出各声道共振峰。 */
class Resonator {
    y1 = 0;
    y2 = 0;
    x2 = 0;
    x1 = 0;
    run(x: number, frequency: number, width: number, rate: number): number {
        const r = Math.exp(-Math.PI * width / rate), c = 2 * r * Math.cos(2 * Math.PI * frequency / rate);
        const y = (1 - r) * (x - this.x2) + c * this.y1 - r * r * this.y2;
        this.x2 = this.x1;
        this.x1 = x;
        this.y2 = this.y1;
        this.y1 = y;
        return y;
    }
}
function synth(ctx: AudioContext, sheep: boolean): AudioBuffer {
    const voice = sheep
        ? { pitch: 190, duration: 0.72, tremolo: 11, depth: 0.35, rough: 0.06, open: 1 }
        : { pitch: 62, duration: 0.95, tremolo: 4, depth: 0.12, rough: 0.22, open: 0.55 };
    const rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.ceil((voice.duration + 0.12) * rate), rate), data = buffer.getChannelData(0);
    const filters = Array.from({ length: 4 }, () => new Resonator());
    let phase = 0, cycle = 0, jitter = 0, previousFlow = 0, low = 0, peak = 0, seed = 7123;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
    for (let i = 0; i < data.length; i++) {
        const t = i / rate, u = t / voice.duration;
        const q = u;
        const attack = Math.min(1, q / (sheep ? 0.045 : 0.085));
        const release = Math.min(1, Math.max(0, (1 - q) / (sheep ? 0.2 : 0.32)));
        const envelope = u >= 1 ? 0 : Math.sin(attack * Math.PI / 2) * Math.sin(release * Math.PI / 2);
        const opening = Math.sin(Math.PI * Math.min(1, Math.max(0, q)) * 0.95) ** 0.5 * voice.open;
        const trill = Math.sin(2 * Math.PI * voice.tremolo * t + 0.6 * Math.sin(t * 17));
        const pitch = voice.pitch * (0.86 + 0.32 * Math.sin(Math.PI * Math.min(1, q)) - 0.08 * q)
            * (1 + (sheep ? 0.035 : 0.018) * trill + jitter);
        phase += pitch / rate;
        if (phase >= 1) {
            phase -= 1;
            cycle++;
            jitter = (random() - 0.5) * (sheep ? 0.035 : 0.065);
        }
        // 不对称开合声门：缓慢张开，快速闭合，以气流导数激励声道。
        const openPhase = sheep ? 0.64 : 0.72;
        let flow = phase < openPhase ? Math.sin(Math.PI * phase / openPhase) ** 1.5 : 0;
        flow *= 1 + voice.rough * (cycle % 2 ? 1 : -1);
        const excitation = (flow - previousFlow) * rate / Math.max(pitch, 1);
        previousFlow = flow;
        const air = (random() * 2 - 1) * (0.025 + voice.rough * 0.08) * (phase < openPhase ? 0.4 : 1);
        const input = excitation + air;
        const f = sheep ? [480 + 130 * opening, 1550 + 260 * opening, 2550, 3400] : [180 + 330 * opening, 480 + 330 * opening, 1350, 2300];
        const w = sheep ? [95, 150, 230, 350] : [65, 110, 180, 300];
        const mix = sheep ? [1, 0.8, 0.3, 0.08] : [1, 0.65, 0.22, 0.06];
        let value = 0;
        for (let k = 0; k < 4; k++)
            value += filters[k].run(input, f[k], w[k], rate) * mix[k];
        const tremolo = 1 - voice.depth * (0.5 + 0.5 * trill);
        value *= envelope * tremolo;
        low += 0.75 * (value - low);
        data[i] = Math.tanh(low * 1.3);
        peak = Math.max(peak, Math.abs(data[i]));
    }
    for (let i = 0; i < data.length; i++)
        data[i] *= 0.72 / Math.max(peak, 0.01);
    return buffer;
}
/** 复用选定的声门合成波形，避免每次命中在手机主线程重新合成。 */
export class AnimalHurtAudio {
    private buffers = new Map<boolean, AudioBuffer>();
    constructor(private ctx: AudioContext) { }
    play(sheep: boolean, dest: AudioNode, volume: number): void {
        let buffer = this.buffers.get(sheep);
        if (!buffer) {
            buffer = synth(this.ctx, sheep);
            this.buffers.set(sheep, buffer);
        }
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        source.buffer = buffer;
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(dest);
        source.onended = () => { source.disconnect(); gain.disconnect(); };
        source.start();
    }
}
