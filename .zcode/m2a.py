import sys
p = 'src/game/Game.ts'
s = open(p, encoding='utf8').read()
fails = []
def rep(old, new, cnt=1):
    global s
    if s.count(old) != cnt:
        fails.append(old.strip().splitlines()[0][:60] + f" (found {s.count(old)}, want {cnt})")
        return
    s = s.replace(old, new)

# ---- 字段与委托 getter ----
rep("""  private collect: CollectSystem;
  private water: WaterSystem;
  private props: Props;
""", "  private props: Props;\n")
rep("""  private crafting: CraftingSystem;
  private workbench: WorkbenchSystem;
""", "  private workbench: WorkbenchSystem;\n")
rep("""  private campfire: CampfireSystem;
  private eating: EatingSystem;
""", "  private campfire: CampfireSystem;\n")
rep("""  private fishing: FishingSystem;
  private archery: BowSystem;
  private drops: DropSystem;
""", "  private drops: DropSystem;\n")
rep("""  private get tools(): Tools {
    return this.local.tools;
  }
""", """  private get tools(): Tools {
    return this.local.tools;
  }
  private get collect(): CollectSystem {
    return this.local.collect;
  }
  private get crafting(): CraftingSystem {
    return this.local.crafting;
  }
  private get eating(): EatingSystem {
    return this.local.eating;
  }
  private get fishing(): FishingSystem {
    return this.local.fishing;
  }
  private get archery(): BowSystem {
    return this.local.archery;
  }
  private get water(): WaterSystem {
    return this.local.water;
  }
""")
rep("""  private lastDead = false;
  private lastHealth = 100;
  private hurtSoundTimer = 0;
""", "")

# ---- InteractionKind 类型 ----
rep("export class Game {", """/* 会话可被占用的交互类别(isSessionBusy 排除自身时用) */
type InteractionKind =
  | 'collect'
  | 'crafting'
  | 'eating'
  | 'fishing'
  | 'archery'
  | 'water'
  | 'workbench'
  | 'campfire'
  | 'crates'
  | 'fences'
  | 'beds';

export class Game {""")

# ---- 构造区 ----
rep("    this.inventory.onAdd = (kind, count) => this.emitPickup(kind, count);\n", "")
rep("""    this.fences = new FenceSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      this.tools,
      // 挖走围栏/门时道具入包,背包放不下的部分掉在玩家身旁
      (kind, count) => this.giveItem(kind, count),
      // 其他占用双手的行为进行中时挖掘让位
      () =>
        this.collect.isWorking ||
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.crates.isDigging ||
        this.beds.isBusy ||
        this.water.isActive
    );
""", """    this.fences = new FenceSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 挖走围栏/门时道具入包,背包放不下的部分掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时放置/挖掘让位
      (actor) => this.isSessionBusy(actor, 'fences')
    );
""")
rep("""    // 穿戴变化即时反映到玩家模型;背包类装备同时扩容背包
    this.equipment.onChange = (slot, kind) => {
      this.player.setEquip(slot, kind);
      const cap = kind ? EQUIPMENT[kind].capacity : undefined;
      if (cap) this.inventory.setCapacity(cap);
    };
""", "")
rep("    this.water = new WaterSystem(this.player, terrain, this.survival, this.audio);\n", "")
rep("""    this.collect = new CollectSystem(
      this.player,
      this.props,
      this.inventory,
      this.tools,
      this.fx,
      this.audio,
      // 合成/进食/钓鱼/播种占用双手,期间采集让位
      () =>
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.crates.isDigging ||
        this.fences.isDigging ||
        this.beds.isBusy
    );
    this.crafting = new CraftingSystem(
      this.player,
      this.inventory,
      this.tools,
      this.fx,
      this.audio,
      // 背包放不下的产物掉在玩家身旁
      (kind, count) => this.giveItem(kind, count),
      // 装备做出来且评分高于身上这件时直接上身
      (kind) => {
        if (isEquipKind(kind)) this.equipment.equip(kind, this.inventory);
      }
    );
""", "")
rep("""    this.workbench = new WorkbenchSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      this.tools,
      // 挖走工作台道具入包,背包放不下的部分掉在玩家身旁
      (kind, count) => this.giveItem(kind, count),
      // 其他占用双手的行为进行中时挖掘让位
      () =>
        this.collect.isWorking ||
        this.crafting.isWorking ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.crates.isDigging ||
        this.fences.isDigging ||
        this.water.isActive
    );
""", """    this.workbench = new WorkbenchSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 挖走工作台道具入包,背包放不下的部分掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'workbench')
    );
""")
rep("""    this.crates = new CrateSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      this.tools,
      // 挖走木箱与箱内物品入包,背包放不下的部分掉在玩家身旁
      (kind, count) => this.giveItem(kind, count),
      // 其他占用双手的行为进行中时挖掘让位
      () =>
        this.collect.isWorking ||
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.water.isActive
    );
""", """    this.crates = new CrateSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 挖走木箱与箱内物品入包,背包放不下的部分掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'crates')
    );
""")
rep("""    this.beds = new BedSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      this.tools,
      // 挖走床时道具入包,背包放不下的部分掉在玩家身旁
      (kind, count) => this.giveItem(kind, count),
      // 其他占用双手的行为进行中时挖掘让位
      () =>
        this.collect.isWorking ||
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.crates.isDigging ||
        this.fences.isDigging ||
        this.water.isActive
    );
""", """    this.beds = new BedSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 挖走床时道具入包,背包放不下的部分掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'beds')
    );
""")
rep("    this.eating = new EatingSystem(this.player, this.inventory, this.survival, this.fx, this.audio);\n", "")
rep("""    this.fishing = new FishingSystem(
      this.scene,
      this.player,
      this.terrain,
      this.inventory,
      this.waterFx,
      this.fx,
      this.audio,
      this.tools
    );
""", "")
rep("""    this.campfire = new CampfireSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      this.tools,
      // 其他占用双手的行为进行中时挖掘让位
      () =>
        this.collect.isWorking ||
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.beds.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.crates.isDigging ||
        this.fences.isDigging ||
        this.water.isActive,
      // 烹饪好的食物背包放不下时掉在玩家身旁
      (kind, count) => this.giveItem(kind, count)
    );
""", """    this.campfire = new CampfireSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'campfire'),
      // 烹饪好的食物背包放不下时掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor)
    );
""")
rep("""    this.archery = new BowSystem(
      this.scene,
      this.player,
      this.terrain,
      this.inventory,
      this.crabs,
      this.birds,
      this.wildlife,
      this.fx,
      this.audio,
      this.tools,
      // 击杀的战利品散落在击杀位置周围,走近后点「捡回」拾取
      (items: { kind: ResourceKind; count: number }[], x: number, z: number) => {
        items.forEach((item, i) => {
          const angle = (i / items.length) * Math.PI * 2;
          this.drops.dropAt(item.kind, item.count, x + Math.cos(angle) * 0.6, z + Math.sin(angle) * 0.6);
        });
      }
    );
""", "")
rep("""    this.drops = new DropSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.fx,
      this.audio
    );
""", """    this.drops = new DropSystem(this.scene, this.terrain, this.fx, this.audio);
    this.attachSessionSystems(this.local);
""")

# ---- 主循环:按会话结算 ----
lines = s.split('\n')
start = next(i for i, l in enumerate(lines) if l == '        this.survival.drainMultiplier = this.dayNight.isNight ? 1.5 : 1;')
end = next(i for i, l in enumerate(lines) if l == '    this.water.update(')
end2 = end
while lines[end2] != '    );':
    end2 += 1
new_loop = '''        // 各会话:生存结算与个人交互系统(采集/制作/进食/钓鱼/弓/喝水/挖掘/搭建)
        for (const s of this.sessions) {
          s.survival.drainMultiplier = this.dayNight.isNight ? 1.5 : 1;
          s.survival.thirstDrainMultiplier =
            this.weather.thirstDrainMultiplier * s.equipment.thirstMultiplier();
          s.survival.swimming = s.player.isSwimming;
          s.survival.sleeping = s.player.isSleeping;
          s.survival.update(delta);
          // 血量下降(受击/饥饿/溺水)触发角色模型闪红与受伤音(音效带间隔节流,持续掉血不成串响)
          if (s.survival.state.health < s.lastHealth - 0.001) {
            s.player.hurt();
            if (s === this.local) {
              s.hurtSoundTimer -= delta;
              if (s.hurtSoundTimer <= 0) {
                this.audio.play('hurt');
                s.hurtSoundTimer = 1.5;
              }
            }
          }
          s.lastHealth = s.survival.state.health;
          s.collect.update(delta);
          s.crafting.update(delta);
          // 工作台配方离台即中断(小幅挪动可能未触发移动中断)
          if (
            s.crafting.isWorking &&
            s.crafting.currentRecipe?.station === 'workbench' &&
            !this.workbench.isNear(s)
          ) {
            s.crafting.cancel();
          }
          s.eating.update(delta);
          s.fishing.update(delta, this.isSessionBusy(s, 'fishing'));
          s.archery.update(delta, this.isSessionBusy(s, 'archery') || s.survival.state.dead);
          s.water.update(delta, this.isSessionBusy(s, 'water'));
          this.crates.updateActor(s, delta);
          this.fences.updateActor(s, delta);
          this.beds.updateActor(s, delta);
          this.workbench.updateActor(s, delta);
          this.campfire.updateActor(s, delta);
          // 手里的种子/围栏用光后自动收起,回到空手
          if (s.player.currentTool !== 'hand' && !this.hasToolFor(s, s.player.currentTool)) {
            s.player.setTool('hand');
          }
        }
        // 睡觉过渡中:天空随进度日夜流转(多人同时睡取最先入睡者的进度)
        for (const s of this.sessions) {
          const sleepProgress = this.beds.getSleepProgress(s);
          if (sleepProgress !== null) {
            this.dayNight.setSleepProgress(sleepProgress);
            break;
          }
        }
        this.fences.update(delta);
        this.campfire.update(delta, elapsed);
        this.drops.update(delta, elapsed);'''
lines[start:end2 + 1] = new_loop.split('\n')
s = '\n'.join(lines)

# ---- 死亡结算按会话 ----
rep("""        if (this.survival.state.dead && !this.lastDead) {
          this.player.setDead();
          this.audio.play('death');
          // 死亡即清档:下次进入从新岛重新开始
          SaveSystem.clear();
        }
        this.lastDead = this.survival.state.dead;
""", """        for (const s of this.sessions) {
          if (s.survival.state.dead && !s.lastDead) {
            s.player.setDead();
            if (s === this.local) {
              this.audio.play('death');
              // 本地玩家死亡即清档:下次进入从新岛重新开始(联机规则后续迭代)
              SaveSystem.clear();
            }
          }
          s.lastDead = s.survival.state.dead;
        }
""")

# ---- 新方法 ----
rep("""  /** 找到某玩家实体所属的会话(本地玩家恒为 local) */
  private sessionOf(player: Player): PlayerSession {
    return this.sessions.find((s) => s.player === player) ?? this.local;
  }
""", """  /** 找到某玩家实体所属的会话(本地玩家恒为 local) */
  private sessionOf(player: Player): PlayerSession {
    return this.sessions.find((s) => s.player === player) ?? this.local;
  }

  /** 该会话是否被任一交互占用;exclude 用来排除询问方自身(“别人忙吗”) */
  private isSessionBusy(s: PlayerSession, exclude?: InteractionKind): boolean {
    if (exclude !== 'collect' && s.collect.isWorking) return true;
    if (exclude !== 'crafting' && s.crafting.isWorking) return true;
    if (exclude !== 'eating' && s.eating.isWorking) return true;
    if (exclude !== 'fishing' && s.fishing.isWorking) return true;
    if (exclude !== 'archery' && s.archery.isWorking) return true;
    if (exclude !== 'water' && s.water.isActive) return true;
    if (exclude !== 'workbench' && (this.workbench.isWorking(s) || this.workbench.isDigging(s)))
      return true;
    if (exclude !== 'campfire' && this.campfire.isBusy(s)) return true;
    if (exclude !== 'crates' && this.crates.isDigging(s)) return true;
    if (exclude !== 'fences' && (this.fences.isDigging(s) || this.fences.isPlacing(s)))
      return true;
    if (exclude !== 'beds' && this.beds.isBusy(s)) return true;
    return false;
  }

  /** 为会话装配玩家侧交互系统(每会话独立一份:采集/制作/进食/钓鱼/弓/喝水) */
  private attachSessionSystems(session: PlayerSession): void {
    const s = session;
    // 拾取提示只飘在本地玩家头顶
    s.inventory.onAdd = (kind, count) => {
      if (s === this.local) this.emitPickup(kind, count);
    };
    // 穿戴变化即时反映到玩家模型;背包类装备同时扩容背包
    s.equipment.onChange = (slot, kind) => {
      s.player.setEquip(slot, kind);
      const cap = kind ? EQUIPMENT[kind].capacity : undefined;
      if (cap) s.inventory.setCapacity(cap);
    };
    s.collect = new CollectSystem(
      s.player,
      this.props,
      s.inventory,
      s.tools,
      this.fx,
      this.audio,
      // 合成/进食/钓鱼/播种占用双手,期间采集让位
      () => this.isSessionBusy(s, 'collect')
    );
    s.crafting = new CraftingSystem(
      s.player,
      s.inventory,
      s.tools,
      this.fx,
      this.audio,
      // 背包放不下的产物掉在玩家身旁
      (kind, count) => this.giveItem(kind, count, s),
      // 装备做出来且评分高于身上这件时直接上身
      (kind) => {
        if (isEquipKind(kind)) s.equipment.equip(kind, s.inventory);
      }
    );
    s.eating = new EatingSystem(s.player, s.inventory, s.survival, this.fx, this.audio);
    s.fishing = new FishingSystem(
      this.scene,
      s.player,
      this.terrain,
      s.inventory,
      this.waterFx,
      this.fx,
      this.audio,
      s.tools
    );
    s.archery = new BowSystem(
      this.scene,
      s.player,
      this.terrain,
      s.inventory,
      this.crabs,
      this.birds,
      this.wildlife,
      this.fx,
      this.audio,
      s.tools,
      // 击杀的战利品散落在击杀位置周围,走近后点「捡回」拾取
      (items: { kind: ResourceKind; count: number }[], x: number, z: number) => {
        items.forEach((item, i) => {
          const angle = (i / items.length) * Math.PI * 2;
          this.drops.dropAt(item.kind, item.count, x + Math.cos(angle) * 0.6, z + Math.sin(angle) * 0.6);
        });
      }
    );
    s.water = new WaterSystem(s.player, this.terrain, s.survival, this.audio);
  }

  /** 手上是否还持有该工具(围栏/门按背包数量判断) */
  private hasToolFor(s: PlayerSession, tool: Exclude<HandTool, 'hand'>): boolean {
    if (tool === 'fence')
      return s.inventory.count('fenceWood') + s.inventory.count('fenceStone') > 0;
    if (tool === 'fenceGate') return s.inventory.count('fenceGate') > 0;
    return !!s.tools[tool];
  }
""")

rep("""    const session = new PlayerSession(player);
    this.sessions.push(session);
    return session;
  }
""", """    const session = new PlayerSession(player);
    this.attachSessionSystems(session);
    this.sessions.push(session);
    return session;
  }
""")
rep("""  removeRemoteSession(session: PlayerSession): void {
    this.sessions = this.sessions.filter((s) => s !== session);
    this.scene.remove(session.player.group);
    session.player.dispose();
  }
""", """  removeRemoteSession(session: PlayerSession): void {
    this.sessions = this.sessions.filter((s) => s !== session);
    this.campfire.detach(session);
    this.workbench.detach(session);
    this.crates.detach(session);
    this.fences.detach(session);
    this.beds.detach(session);
    this.scene.remove(session.player.group);
    session.player.dispose();
  }
""")

rep("""  /** 手上是否还持有该工具(围栏/门按背包数量判断) */
  private hasTool(tool: Exclude<HandTool, 'hand'>): boolean {
    if (tool === 'fence')
      return this.inventory.count('fenceWood') + this.inventory.count('fenceStone') > 0;
    if (tool === 'fenceGate') return this.inventory.count('fenceGate') > 0;
    return !!this.tools[tool];
  }
""", """  /** 本地玩家手上是否还持有该工具 */
  private hasTool(tool: Exclude<HandTool, 'hand'>): boolean {
    return this.hasToolFor(this.local, tool);
  }
""")

rep("    this.player.dispose();\n", "    for (const s of this.sessions) s.player.dispose();\n")

if fails:
    print("FAILED:")
    for f in fails:
        print(" -", f)
    sys.exit(1)
open(p, 'w', encoding='utf8', newline='\n').write(s)
print("ok")
