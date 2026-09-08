/**
 * 局外养成的「每日一次」运行时状态:跨天自动重置。
 * 每个标记在被消费(取走)时判断,保证每天最多触发一次;不入存档,重开对局自然归零。
 */
export class MetaDaily {
  private day = -1;
  /** 省饵:今天已用掉的前 N 竿免饵次数 */
  freeBaitCasts = 0;
  /** 满载:今天的第一竿是否已被消费 */
  firstCastUsed = false;
  /** 不脱钩:今天的自动咬钩是否已被消费 */
  autoBiteUsed = false;
  /** 拾穗:今天的首次采集双倍是否已被消费 */
  firstCollectUsed = false;
  /** 剥取:今天的第一只猎物翻倍是否已被消费 */
  firstKillUsed = false;
  /** 神射:今天已用掉的前 N 支免箭次数 */
  freeArrows = 0;

  /** 跨天重置(Game 主循环每帧调用) */
  ensure(day: number): void {
    if (day === this.day) return;
    this.day = day;
    this.freeBaitCasts = 0;
    this.firstCastUsed = false;
    this.autoBiteUsed = false;
    this.firstCollectUsed = false;
    this.firstKillUsed = false;
    this.freeArrows = 0;
  }
}
