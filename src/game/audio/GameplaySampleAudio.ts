import { gameplaySamples, type GameplaySampleName } from './GameplaySampleData';

/** 每个上下文预解码一次；饮品可按指定周期轻微调速，其余采样保持原速。 */
export class GameplaySampleAudio {
  private buffers = new Map<GameplaySampleName, AudioBuffer>();
  private active = new Map<GameplaySampleName, { source: AudioBufferSourceNode; gain: GainNode; endAt?: number }>();

  constructor(private ctx: AudioContext) {
    for (const name of Object.keys(gameplaySamples) as GameplaySampleName[]) {
      const bytes = Uint8Array.from(atob(gameplaySamples[name]), char => char.charCodeAt(0));
      void ctx.decodeAudioData(bytes.buffer).then(buffer => {
        this.buffers.set(name, buffer);
      }).catch(error => console.warn(`音效解码失败: ${name}`, error));
    }
  }

  stop(name: string): void {
    const key = name as GameplaySampleName;
    const voice = this.active.get(key);
    if (!voice) return;
    this.active.delete(key);
    const now = this.ctx.currentTime;
    const end = Math.max(now, Math.min(now + 0.05, voice.endAt ?? Infinity));
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, end);
    voice.source.stop(end);
  }

  /** 返回是否由采样负责；尚未解码时跳过，不延迟补播过期交互。 */
  duration(name: GameplaySampleName): number {
    return this.buffers.get(name)?.duration ?? 0;
  }

  play(name: string, dest: AudioNode, volume: number, endIn?: number, repeat?: { total: number; count: number }): boolean {
    if (!Object.prototype.hasOwnProperty.call(gameplaySamples, name)) return false;
    const key = name as GameplaySampleName;
    const buffer = this.buffers.get(key);
    if (!buffer || this.ctx.state === 'closed') return endIn === undefined;
    if (endIn !== undefined && endIn <= 0) return false;
    const sustained = key === 'drink' || key === 'snore' || key === 'eatFinish';
    if (sustained && this.active.has(key)) return true;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(dest);
    const now = this.ctx.currentTime;
    if (sustained) this.active.set(key, { source, gain, endAt: endIn === undefined ? undefined : now + endIn });
    source.onended = () => {
      if (this.active.get(key)?.source === source) this.active.delete(key);
      source.disconnect();
      gain.disconnect();
    };
    const remaining = endIn ?? buffer.duration;
    if (repeat) {
      const period = repeat.total / repeat.count;
      const rate = buffer.duration / period;
      source.playbackRate.value = rate;
      source.loop = true;
      const offset = (Math.max(0, repeat.total - remaining) % period) * rate;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.005, remaining / 2));
      gain.gain.setValueAtTime(volume, now + Math.max(remaining / 2, remaining - 0.015));
      gain.gain.linearRampToValueAtTime(0, now + remaining);
      source.start(now, offset);
      source.stop(now + remaining);
    } else {
      source.start(now + Math.max(0, remaining - buffer.duration), Math.max(0, buffer.duration - remaining));
    }
    return true;
  }
}
