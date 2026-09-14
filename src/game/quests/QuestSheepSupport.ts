import type { PlayerSession } from '../mp/PlayerSession';
import type { Wildlife } from '../entities/Wildlife';
import type { IslandTerrain } from '../world/IslandTerrain';
import { RECIPES } from '../systems/Crafting';
import { QUESTS } from './QuestDefinitions';
import { QuestRoute } from './QuestRoute';
import { QuestScreenViews } from './QuestScreenViews';

/** 房主每秒检查一次，每个任务检查点最多补一只；成功记录随个人存档保存。 */
export class QuestSheepSupport {
  readonly screens = new QuestScreenViews();
  private route: QuestRoute;
  constructor(private terrain: IslandTerrain, private wildlife: Wildlife) {
    this.route = new QuestRoute(terrain);
  }

  update(sessions: readonly PlayerSession[]): void {
    for (const session of sessions) {
      const q = session.quests.view;
      if (!q?.enabled || q.finished || session.survival.state.dead || session.player.isSwimming || !this.screens.hasCurrent(session)) continue;
      const quest = QUESTS[q.active];
      let key: string;
      if (quest?.id === 'fur') {
        key = 'fur';
        if (this.wildlife.guideSheep().some(p => this.screens.visible(session, { ...p, y: this.terrain.getHeight(p.x, p.z) }))) continue;
      } else if (quest?.id === 'leather') {
        let needed = 0;
        const completed: string[] = [];
        quest.requirements.forEach((req, index) => {
          if (req.type !== 'craft') return;
          if (q.rows[index].have >= q.rows[index].need) completed.push(req.id);
          else needed += RECIPES.find(r => r.id === req.id)?.cost.fur ?? 0;
        });
        if (session.inventory.count('fur') >= needed) continue;
        key = `leather:${completed.sort().join(',')}`;
      } else continue;
      if (session.quests.hasSheepSupport(key)) continue;
      const origin = session.player.group.position;
      const candidates: { x: number; z: number }[] = [];
      for (let i = 0; i < 96; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 12 + Math.random() * 36;
        const x = origin.x + Math.cos(angle) * distance;
        const z = origin.z + Math.sin(angle) * distance;
        if (!this.wildlife.canSpawnQuestSheep(x, z)) continue;
        const point = { x, y: this.terrain.getHeight(x, z), z };
        if (sessions.some(s => this.screens.visible(s, point))) continue;
        candidates.push({ x, z });
      }
      const path = this.route.find(origin, candidates, 1);
      const target = path?.[path.length - 1];
      if (target && this.wildlife.spawnQuestSheep(target.x, target.z)) session.quests.markSheepSupport(key);
    }
  }
}
