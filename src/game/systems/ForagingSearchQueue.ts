export type SearchTask = { work: Generator<void, void>; cancelled: boolean };

/** 一个世界共用预算；按小步轮转，失败的复杂搜索不会独占一帧。 */
export class ForagingSearchQueue {
  private tasks: SearchTask[] = [];
  constructor(private readonly now: () => number = () => performance.now()) {}

  get pending(): number { return this.tasks.length; }

  add(work: Generator<void, void>): SearchTask {
    const task = { work, cancelled: false };
    this.tasks.push(task);
    return task;
  }

  cancel(task: SearchTask): void {
    task.cancelled = true;
    const index = this.tasks.indexOf(task);
    if (index >= 0) this.tasks.splice(index, 1);
    task.work.return();
  }

  /** 每个 yield 至多一个碰撞采样或资源筛选；预算不随动物数量叠加。 */
  update(): void {
    const deadline = this.now() + 2;
    for (let steps = 0; steps < 2048 && this.tasks.length && this.now() < deadline; steps++) {
      const task = this.tasks.shift()!;
      if (task.cancelled) continue;
      if (!task.work.next().done) this.tasks.push(task);
    }
  }
}
