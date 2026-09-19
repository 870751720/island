type Timing = { total: number; max: number };
type Frame = { at: number; cpu: number; interval: number; stages: Record<string, number> };

/** 临时、按需采集；只保存汇总和最慢十帧，避免诊断自身积累内存。 */
export class FrameDiagnostics {
  active = false;
  frames = 0;
  private started = 0;
  private ended = 0;
  private last = 0;
  private stages: Record<string, number> = {};
  private totals: Record<string, Timing> = {};
  private worst: Frame[] = [];
  private longestIntervals: { atMs: number; intervalMs: number; previousCpuMs: number }[] = [];
  private previousCpu = 0;
  private cpu = 0;
  private gaps = 0;
  private slow = 0;
  private skipped = 0;
  private context: Record<string, unknown> = {};
  private metrics: Record<string, unknown> = {};
  private firstMetrics: Record<string, unknown> | null = null;

  private readonly now: () => number;
  constructor(now: () => number = () => performance.now()) { this.now = now; }

  start(context: Record<string, unknown>): void {
    this.active = true;
    this.started = this.ended = this.now();
    this.frames = this.cpu = this.gaps = this.slow = this.skipped = 0;
    this.totals = {}; this.worst = []; this.stages = {}; this.metrics = {};
    this.longestIntervals = []; this.previousCpu = 0; this.firstMetrics = null;
    this.context = context;
  }

  stop(): void { if (this.active) this.ended = this.now(); this.active = false; }

  begin(): void {
    if (!this.active) return;
    this.last = this.now();
    this.stages = {};
  }

  mark(name: string): void {
    if (!this.active) return;
    const at = this.now();
    this.stages[name] = (this.stages[name] ?? 0) + at - this.last;
    this.last = at;
  }

  record(interval: number, cpu: number, hidden: boolean, metrics: Record<string, unknown>): void {
    if (!this.active) return;
    this.ended = this.now();
    // 保留超过一秒的前台卡顿；只有隐藏页面的样本剔除。
    if (hidden) this.skipped++;
    else {
      this.frames++; this.cpu += cpu;
      this.firstMetrics ??= metrics;
      if (this.frames > 1) {
        this.longestIntervals.push({ atMs: this.ended - this.started, intervalMs: interval, previousCpuMs: this.previousCpu });
        this.longestIntervals.sort((a, b) => b.intervalMs - a.intervalMs);
        this.longestIntervals.length = Math.min(5, this.longestIntervals.length);
      }
      if (cpu >= 50) this.slow++;
      if (interval >= 100) this.gaps++;
      for (const [name, value] of Object.entries(this.stages)) {
        const total = this.totals[name] ??= { total: 0, max: 0 };
        total.total += value; total.max = Math.max(total.max, value);
      }
      this.worst.push({ at: this.ended - this.started, cpu, interval, stages: this.stages });
      this.worst.sort((a, b) => b.cpu - a.cpu);
      this.worst.length = Math.min(10, this.worst.length);
      this.metrics = metrics;
    }
    this.previousCpu = cpu;
    if (this.ended - this.started >= 120000) this.stop();
  }

  report(): string {
    const round = (n: number) => Math.round(n * 100) / 100;
    return JSON.stringify({
      format: 'island-frame-diagnostics-v1', ...this.context,
      durationSeconds: round((this.ended - this.started) / 1000), frames: this.frames,
      meanCpuMs: round(this.cpu / Math.max(1, this.frames)), slowCpuFrames: this.slow,
      longFrameIntervals: this.gaps, hiddenSamples: this.skipped, initial: this.firstMetrics, latest: this.metrics,
      longestIntervals: this.longestIntervals.map(f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, round(v)]))),
      stages: Object.fromEntries(Object.entries(this.totals).sort((a, b) => b[1].total - a[1].total)
        .map(([name, value]) => [name, { meanMs: round(value.total / Math.max(1, this.frames)), maxMs: round(value.max) }])),
      worstCpuFrames: this.worst.map(f => ({ atMs: round(f.at), cpuMs: round(f.cpu), intervalMs: round(f.interval),
        stages: Object.fromEntries(Object.entries(f.stages).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, round(v)])) })),
      note: '阶段耗时为当前帧主线程墙钟时间，含可能的GC/浏览器等待；interval是本帧开始距上一帧开始，不等于当前帧CPU。渲染项不是GPU计时。',
    }, null, 2);
  }
}
