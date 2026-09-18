import { gameplaySamples, type GameplaySampleName } from './GameplaySampleData';

/** 每个上下文预解码一次；播放不改变采样的速度与音高。 */
export class GameplaySampleAudio {
  private buffers = new Map<GameplaySampleName, AudioBuffer>();
  private active = new Map<GameplaySampleName, { source: AudioBufferSourceNode; gain: GainNode }>();

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
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + 0.05);
    voice.source.stop(now + 0.05);
  }

  /** 返回是否由采样负责；尚未解码时跳过，不延迟补播过期交互。 */
  play(name: string, dest: AudioNode, volume: number): boolean {
    if (!Object.prototype.hasOwnProperty.call(gameplaySamples, name)) return false;
    const key = name as GameplaySampleName;
    const buffer = this.buffers.get(key);
    if (!buffer || this.ctx.state === 'closed') return true;
    const sustained = key === 'drink' || key === 'snore';
    if (sustained && this.active.has(key)) return true;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(dest);
    if (sustained) this.active.set(key, { source, gain });
    source.onended = () => {
      if (this.active.get(key)?.source === source) this.active.delete(key);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
    return true;
  }
}
