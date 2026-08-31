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

# ---- 按钮方法:加 actor 参数(默认本地会话,联机时房主可代客人发起) ----
rep("""  eatFood(kind?: ResourceKind): boolean {
    if (
      this.crafting.isWorking ||
      this.workbench.isWorking ||
      this.eating.isWorking ||
      this.fishing.isWorking ||
      this.beds.isBusy
    ) {
      return false;
    }
    const food = kind
      ? FOODS.find((f) => f.kind === kind)
      : firstFoodIn(this.inventory.snapshot());
    return food ? this.eating.start(food) : false;
  }
""", """  eatFood(kind?: ResourceKind, actor: PlayerSession = this.local): boolean {
    const a = actor;
    if (
      a.crafting.isWorking ||
      this.workbench.isWorking(a) ||
      a.eating.isWorking ||
      a.fishing.isWorking ||
      this.beds.isBusy(a)
    ) {
      return false;
    }
    const food = kind ? FOODS.find((f) => f.kind === kind) : firstFoodIn(a.inventory.snapshot());
    return food ? a.eating.start(food) : false;
  }
""")
rep("""  startFishing(): boolean {
    if (
      this.crafting.isWorking ||
      this.workbench.isWorking ||
      this.workbench.isDigging ||
      this.eating.isWorking ||
      this.beds.isBusy ||
      this.water.isActive
    ) {
      return false;
    }
    return this.fishing.start();
  }
""", """  startFishing(actor: PlayerSession = this.local): boolean {
    const a = actor;
    if (
      a.crafting.isWorking ||
      this.workbench.isWorking(a) ||
      this.workbench.isDigging(a) ||
      a.eating.isWorking ||
      this.beds.isBusy(a) ||
      a.water.isActive
    ) {
      return false;
    }
    return a.fishing.start();
  }
""")
rep("""  hookFish(): boolean {
    return this.fishing.hook();
  }
""", """  hookFish(actor: PlayerSession = this.local): boolean {
    return actor.fishing.hook();
  }
""")
rep("""  gmGiveItem(kind: ResourceKind, count: number): void {
    if ((TOOL_IDS as string[]).includes(kind)) {
      this.tools[kind as ToolId] = 1;
      return;
    }
    this.giveItem(kind, count);
  }
""", """  gmGiveItem(kind: ResourceKind, count: number, actor: PlayerSession = this.local): void {
    if ((TOOL_IDS as string[]).includes(kind)) {
      actor.tools[kind as ToolId] = 1;
      return;
    }
    this.giveItem(kind, count, actor);
  }
""")
rep("""  giveItem(kind: ResourceKind, count: number): number {
    const added = this.inventory.add(kind, count);
    const overflow = count - added;
    if (overflow > 0) this.drops.dropOverflow(kind, overflow);
    return added;
  }
""", """  giveItem(kind: ResourceKind, count: number, actor: PlayerSession = this.local): number {
    const added = actor.inventory.add(kind, count);
    const overflow = count - added;
    if (overflow > 0) this.drops.dropOverflow(kind, overflow, actor);
    return added;
  }
""")
rep("""  useCrate(): boolean {
    if (this.asleep) return false;
    if (!this.crates.use()) {
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    this.afterPlaceDiggable();
    return true;
  }
""", """  useCrate(actor: PlayerSession = this.local): boolean {
    if (this.asleepFor(actor)) return false;
    if (!this.crates.use(actor)) {
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }
""")
rep("""  useWorkbenchItem(kind: ResourceKind): boolean {
    const level = workbenchItemLevel(kind);
    if (this.asleep || level === null || !this.workbench.placeItem(level)) {
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    this.afterPlaceDiggable();
    return true;
  }
""", """  useWorkbenchItem(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    const level = workbenchItemLevel(kind);
    if (this.asleepFor(actor) || level === null || !this.workbench.placeItem(actor, level)) {
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }
""")
rep("""  useBedItem(kind: ResourceKind): boolean {
    const level = bedItemLevel(kind);
    if (this.asleep || level === null || !this.beds.place(level)) {
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    this.afterPlaceDiggable();
    return true;
  }
""", """  useBedItem(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    const level = bedItemLevel(kind);
    if (this.asleepFor(actor) || level === null || !this.beds.place(actor, level)) {
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }
""")
rep("""  sleep(): boolean {
    if (this.beds.isBusy || !this.beds.nearby || this.survival.state.dead) return false;
    const s = this.survival.state;
    if (s.hunger < Game.SLEEP_COST || s.thirst < Game.SLEEP_COST) {
      this.notify('又饿又渴睡不着,先吃点喝点再睡吧');
      return false;
    }
    const skipped = this.dayNight.beginSleep();
    return this.beds.startSleep(
      () => {
        this.dayNight.endSleep();
        this.props.advance(skipped);
        this.campfire.passTime(skipped, performance.now() / 1000);
        s.hunger -= Game.SLEEP_COST;
        s.thirst -= Game.SLEEP_COST;
        s.health = Math.min(100, s.health + Game.SLEEP_COST);
        this.audio.play('success');
        const p = this.player.group.position.clone();
        p.y += 0.8;
        this.fx.burst(p, '#cfe8ff', 14);
        this.notify('一觉睡到了第二天清晨');
      }
    );
  }
""", """  sleep(actor: PlayerSession = this.local): boolean {
    const a = actor;
    if (this.beds.isBusy(a) || !this.beds.nearby(a) || a.survival.state.dead) return false;
    const s = a.survival.state;
    if (s.hunger < Game.SLEEP_COST || s.thirst < Game.SLEEP_COST) {
      if (a === this.local) this.notify('又饿又渴睡不着,先吃点喝点再睡吧');
      return false;
    }
    const skipped = this.dayNight.beginSleep();
    return this.beds.startSleep(
      a,
      () => {
        this.dayNight.endSleep();
        this.props.advance(skipped);
        this.campfire.passTime(skipped, performance.now() / 1000);
        s.hunger -= Game.SLEEP_COST;
        s.thirst -= Game.SLEEP_COST;
        s.health = Math.min(100, s.health + Game.SLEEP_COST);
        this.audio.play('success');
        const p = a.player.group.position.clone();
        p.y += 0.8;
        this.fx.burst(p, '#cfe8ff', 14);
        if (a === this.local) this.notify('一觉睡到了第二天清晨');
      }
    );
  }
""")
rep("""  useFenceItem(kind: ResourceKind): boolean {
    if (this.asleep) return false;
    const fenceKind = fenceKindOfItem(kind);
    const ok = fenceKind
      ? this.fences.useFence(fenceKind)
      : kind === 'fenceGate'
        ? this.fences.useGate()
        : false;
    if (!ok) {
      this.notify('这里放不下,找块没东西的干地正对着要围的方向试试');
      return false;
    }
    this.afterPlaceDiggable();
    return true;
  }
""", """  useFenceItem(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    const a = actor;
    if (this.asleepFor(a)) return false;
    const fenceKind = fenceKindOfItem(kind);
    const ok = fenceKind
      ? this.fences.useFence(a, fenceKind)
      : kind === 'fenceGate'
        ? this.fences.useGate(a)
        : false;
    if (!ok) {
      this.notify('这里放不下,找块没东西的干地正对着要围的方向试试');
      return false;
    }
    this.afterPlaceDiggable(a);
    return true;
  }
""")
rep("""  private afterPlaceDiggable(): void {
    if (this.player.currentTool === 'hoe') this.player.setTool('hand');
  }
""", """  private afterPlaceDiggable(actor: PlayerSession = this.local): void {
    if (actor.player.currentTool === 'hoe') actor.player.setTool('hand');
  }
""")
rep("""  useBottle(): string | null {
    return openBottle(this.inventory);
  }
""", """  useBottle(actor: PlayerSession = this.local): string | null {
    return openBottle(actor.inventory);
  }
""")
rep("""  useSeed(kind: ResourceKind): boolean {
    if (this.asleep) return false;
    const species = (Object.keys(SEED_OF) as (keyof typeof SEED_OF)[]).find((s) => SEED_OF[s] === kind);
    if (!species || this.inventory.count(kind) <= 0) return false;
    const p = this.player.group.position;
    if (
      this.player.isSwimming ||
      this.terrain.isNearWater(p, 1) ||
      this.terrain.getHeight(p.x, p.z) <= 0 ||
      this.props.isOccupied(p, 1)
    ) {
      this.notify('这里种不了,找个没东西的干地试试');
      return false;
    }
    this.inventory.remove(kind, 1);
    this.props.plant(species, p.x, p.z);
""", """  useSeed(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    const a = actor;
    if (this.asleepFor(a)) return false;
    const species = (Object.keys(SEED_OF) as (keyof typeof SEED_OF)[]).find((s) => SEED_OF[s] === kind);
    if (!species || a.inventory.count(kind) <= 0) return false;
    const p = a.player.group.position;
    if (
      a.player.isSwimming ||
      this.terrain.isNearWater(p, 1) ||
      this.terrain.getHeight(p.x, p.z) <= 0 ||
      this.props.isOccupied(p, 1)
    ) {
      this.notify('这里种不了,找个没东西的干地试试');
      return false;
    }
    a.inventory.remove(kind, 1);
    this.props.plant(species, p.x, p.z);
""")
rep("""  useBush(kind: 'berryBush' | 'shrubBush' | 'grassTuft'): boolean {
    if (this.asleep) return false;
    if (this.inventory.count(kind) <= 0) return false;
    const p = this.player.group.position;
    if (
      this.player.isSwimming ||
      this.terrain.isNearWater(p, 1) ||
      this.terrain.getHeight(p.x, p.z) <= 0 ||
      this.props.isOccupied(p, 1)
    ) {
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    this.inventory.remove(kind, 1);
""", """  useBush(kind: 'berryBush' | 'shrubBush' | 'grassTuft', actor: PlayerSession = this.local): boolean {
    const a = actor;
    if (this.asleepFor(a)) return false;
    if (a.inventory.count(kind) <= 0) return false;
    const p = a.player.group.position;
    if (
      a.player.isSwimming ||
      this.terrain.isNearWater(p, 1) ||
      this.terrain.getHeight(p.x, p.z) <= 0 ||
      this.props.isOccupied(p, 1)
    ) {
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    a.inventory.remove(kind, 1);
""")
rep("""    this.props.placeBush(bushKind, p.x, p.z);
    this.afterPlaceDiggable();
""", """    this.props.placeBush(bushKind, p.x, p.z);
    this.afterPlaceDiggable(a);
""")
rep("""  pickupDrop(): boolean {
    if (this.asleep) return false;
    const near = this.drops.getNearby();
    if (!near) return false;
    if (!this.inventory.canFit(near.kind)) {
      this.notify('背包满了,装不下更多东西');
      return false;
    }
    return this.drops.pickupNearby();
  }
""", """  pickupDrop(actor: PlayerSession = this.local): boolean {
    const a = actor;
    if (this.asleepFor(a)) return false;
    const near = this.drops.getNearby(a);
    if (!near) return false;
    if (!a.inventory.canFit(near.kind)) {
      this.notify('背包满了,装不下更多东西');
      return false;
    }
    return this.drops.pickupNearby(a);
  }
""")
rep("""  craftCampfire(): boolean {
    if (this.asleep) return false;
    return this.campfire.start();
  }
""", """  craftCampfire(actor: PlayerSession = this.local): boolean {
    if (this.asleepFor(actor)) return false;
    return this.campfire.start(actor);
  }
""")
rep("""  crateStore(kind: ResourceKind): boolean {
    if (this.asleep) return false;
    if (!this.crates.store(kind)) {
      this.notify('木箱装不下了');
      return false;
    }
    return true;
  }
""", """  crateStore(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    if (this.asleepFor(actor)) return false;
    if (!this.crates.store(actor, kind)) {
      this.notify('木箱装不下了');
      return false;
    }
    return true;
  }
""")
rep("""  crateTake(kind: ResourceKind): boolean {
    if (this.asleep) return false;
    if (!this.crates.take(kind)) {
      this.notify('背包满了,装不下更多东西');
      return false;
    }
    return true;
  }
""", """  crateTake(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    if (this.asleepFor(actor)) return false;
    if (!this.crates.take(actor, kind)) {
      this.notify('背包满了,装不下更多东西');
      return false;
    }
    return true;
  }
""")
rep("""  campfireAddFuel(kind: ResourceKind): boolean {
    if (this.asleep) return false;
    return this.campfire.addFuel(kind) > 0;
  }
""", """  campfireAddFuel(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    if (this.asleepFor(actor)) return false;
    return this.campfire.addFuel(actor, kind) > 0;
  }
""")
rep("""  campfireCook(kind: ResourceKind, count: number): boolean {
    if (this.asleep) return false;
    return this.campfire.startCooking(kind, count);
  }
""", """  campfireCook(kind: ResourceKind, count: number, actor: PlayerSession = this.local): boolean {
    if (this.asleepFor(actor)) return false;
    return this.campfire.startCooking(actor, kind, count);
  }
""")
rep("""  dropItem(kind: ResourceKind, count = 1): boolean {
    if (this.asleep) return false;
    const n = Math.min(count, this.inventory.count(kind));
    if (n <= 0) return false;
    this.inventory.remove(kind, n);
    this.drops.drop(kind, n);
    return true;
  }
""", """  dropItem(kind: ResourceKind, count = 1, actor: PlayerSession = this.local): boolean {
    const a = actor;
    if (this.asleepFor(a)) return false;
    const n = Math.min(count, a.inventory.count(kind));
    if (n <= 0) return false;
    a.inventory.remove(kind, n);
    this.drops.drop(kind, n, a);
    return true;
  }
""")
rep("""  moveItem(from: number, to: number): boolean {
    return this.inventory.move(from, to);
  }
""", """  moveItem(from: number, to: number, actor: PlayerSession = this.local): boolean {
    return actor.inventory.move(from, to);
  }
""")
rep("""  equipItem(kind: ResourceKind): boolean {
    return isEquipKind(kind) ? this.equipment.equip(kind, this.inventory, true) : false;
  }
""", """  equipItem(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    return isEquipKind(kind) ? actor.equipment.equip(kind, actor.inventory, true) : false;
  }
""")
rep("""  unequipItem(slot: EquipSlot): boolean {
    return this.equipment.unequip(slot, this.inventory);
  }
""", """  unequipItem(slot: EquipSlot, actor: PlayerSession = this.local): boolean {
    return actor.equipment.unequip(slot, actor.inventory);
  }
""")
rep("""  craftTool(id: CraftId): boolean {
    if (this.asleep || this.workbench.isWorking || this.workbench.isDigging) return false;
    const recipe = RECIPES.find((r) => r.id === id);
    return recipe && recipe.station === 'hand' ? this.crafting.start(recipe) : false;
  }
""", """  craftTool(id: CraftId, actor: PlayerSession = this.local): boolean {
    const a = actor;
    if (this.asleepFor(a) || this.workbench.isWorking(a) || this.workbench.isDigging(a)) return false;
    const recipe = RECIPES.find((r) => r.id === id);
    return recipe && recipe.station === 'hand' ? a.crafting.start(recipe) : false;
  }
""")
rep("""  craftAtWorkbench(id: CraftId, count: number): boolean {
    if (this.asleep || this.workbench.isWorking || this.workbench.isDigging || !this.workbench.isNear) return false;
    const recipe = RECIPES.find((r) => r.id === id);
    return recipe &&
      recipe.station === 'workbench' &&
      (recipe.minBenchLevel ?? 1) <= this.workbench.level
      ? this.crafting.start(recipe, count)
      : false;
  }
""", """  craftAtWorkbench(id: CraftId, count: number, actor: PlayerSession = this.local): boolean {
    const a = actor;
    if (
      this.asleepFor(a) ||
      this.workbench.isWorking(a) ||
      this.workbench.isDigging(a) ||
      !this.workbench.isNear(a)
    ) {
      return false;
    }
    const recipe = RECIPES.find((r) => r.id === id);
    return recipe &&
      recipe.station === 'workbench' &&
      (recipe.minBenchLevel ?? 1) <= this.workbench.level(a)
      ? a.crafting.start(recipe, count)
      : false;
  }
""")
rep("""  craftWorkbench(): boolean {
    if (this.asleep || this.crafting.isWorking || this.eating.isWorking) return false;
    return this.workbench.start();
  }
""", """  craftWorkbench(actor: PlayerSession = this.local): boolean {
    if (this.asleepFor(actor) || actor.crafting.isWorking || actor.eating.isWorking) return false;
    return this.workbench.start(actor);
  }
""")
rep("""  upgradeWorkbench(): boolean {
    if (this.asleep || this.crafting.isWorking || this.eating.isWorking) return false;
    return this.workbench.upgrade();
  }
""", """  upgradeWorkbench(actor: PlayerSession = this.local): boolean {
    if (this.asleepFor(actor) || actor.crafting.isWorking || actor.eating.isWorking) return false;
    return this.workbench.upgrade(actor);
  }
""")

# asleep 改为按会话
rep("""  /** 睡觉期间锁交互:一切主动操作入口先检查该状态 */
  private get asleep(): boolean {
    return this.player.isSleeping;
  }
""", """  /** 睡觉期间锁交互:一切主动操作入口先检查该状态 */
  private asleepFor(actor: PlayerSession): boolean {
    return actor.player.isSleeping;
  }
""")

# ---- pushHud:世界系统查询按本地会话 ----
rep("      nearCrate: !!this.crates.nearby,", "      nearCrate: !!this.crates.nearby(this.local),")
rep("      nearBed: !!this.beds.nearby,", "      nearBed: !!this.beds.nearby(this.local),")
rep("      bedSleeping: this.beds.isSleeping,", "      bedSleeping: this.beds.isSleeping(this.local),")
rep("      bedSleepProgress: this.beds.getSleepProgress() ?? 0,", "      bedSleepProgress: this.beds.getSleepProgress(this.local) ?? 0,")
rep("      crateSlots: this.crates.nearbySlots(),", "      crateSlots: this.crates.nearbySlots(this.local),")
rep("      canCraftWorkbench: this.workbench.canStart(),", "      canCraftWorkbench: this.workbench.canStart(this.local),")
rep("      workbenchCrafting: this.workbench.isWorking,", "      workbenchCrafting: this.workbench.isWorking(this.local),")
rep("      workbenchProgress: this.workbench.getProgress() ?? 0,", "      workbenchProgress: this.workbench.getProgress(this.local) ?? 0,")
rep("      workbenchLevel: this.workbench.level,", "      workbenchLevel: this.workbench.level(this.local),")
rep("      nearWorkbench: this.workbench.isNear,", "      nearWorkbench: this.workbench.isNear(this.local),")
rep("      canCraftCampfire: this.campfire.canStart(),", "      canCraftCampfire: this.campfire.canStart(this.local),")
rep("      canBuildCampfire: this.campfire.canBuild(),", "      canBuildCampfire: this.campfire.canBuild(this.local),")
rep("      campfireCrafting: this.campfire.isBusy,", "      campfireCrafting: this.campfire.isBusy(this.local),")
rep("      campfireProgress: this.campfire.getProgress() ?? 0,", "      campfireProgress: this.campfire.getProgress(this.local) ?? 0,")
rep("      nearCampfire: !!this.campfire.nearby,", "      nearCampfire: !!this.campfire.nearby(this.local),")
rep("      campfireInfo: this.campfire.getCampfireInfo(),", "      campfireInfo: this.campfire.getCampfireInfo(this.local),")
rep("      nearDrop: this.drops.getNearby(),", "      nearDrop: this.drops.getNearby(this.local),")

# ---- updateIndicator:世界系统查询按本地会话 ----
rep("    } else if (this.workbench.isWorking) {", "    } else if (this.workbench.isWorking(this.local)) {")
rep("      label = this.workbench.isUpgrading ? '升级中:工作台' : '制作中:工作台';\n      progress = this.workbench.getProgress();", "      label = this.workbench.isUpgrading(this.local) ? '升级中:工作台' : '制作中:工作台';\n      progress = this.workbench.getProgress(this.local);")
rep("    } else if (this.workbench.isDigging) {\n      label = '挖工作台…';\n      progress = this.workbench.getDigProgress();", "    } else if (this.workbench.isDigging(this.local)) {\n      label = '挖工作台…';\n      progress = this.workbench.getDigProgress(this.local);")
rep("    } else if (this.crates.isDigging) {\n      label = '挖木箱…';\n      progress = this.crates.getDigProgress();", "    } else if (this.crates.isDigging(this.local)) {\n      label = '挖木箱…';\n      progress = this.crates.getDigProgress(this.local);")
rep("    } else if (this.fences.isPlacing) {", "    } else if (this.fences.isPlacing(this.local)) {")
rep("      progress = this.fences.getPlaceProgress();", "      progress = this.fences.getPlaceProgress(this.local);")
rep("    } else if (this.fences.isDigging) {\n      label = '拆围栏…';\n      progress = this.fences.getDigProgress();", "    } else if (this.fences.isDigging(this.local)) {\n      label = '拆围栏…';\n      progress = this.fences.getDigProgress(this.local);")
rep("    } else if (this.beds.isSleeping) {\n      label = '睡觉中…';\n      progress = this.beds.getSleepProgress();", "    } else if (this.beds.isSleeping(this.local)) {\n      label = '睡觉中…';\n      progress = this.beds.getSleepProgress(this.local);")
rep("    } else if (this.beds.isDigging) {\n      label = '挖床…';\n      progress = this.beds.getDigProgress();", "    } else if (this.beds.isDigging(this.local)) {\n      label = '挖床…';\n      progress = this.beds.getDigProgress(this.local);")
rep("    } else if (this.campfire.isDigging) {\n      label = '挖火堆…';\n      progress = this.campfire.getDigProgress();", "    } else if (this.campfire.isDigging(this.local)) {\n      label = '挖火堆…';\n      progress = this.campfire.getDigProgress(this.local);")
rep("    } else if (this.campfire.isCooking) {\n      const { total, current } = this.campfire.cookInfo;\n      const food = ITEMS[this.campfire.cookingKind!];", "    } else if (this.campfire.isCooking(this.local)) {\n      const { total, current } = this.campfire.cookInfo(this.local);\n      const food = ITEMS[this.campfire.cookingKind(this.local)!];")
rep("""    } else if (this.campfire.isWorking) {
      label = '搭建中:小火堆';
      progress = this.campfire.getProgress();""", """    } else if (this.campfire.isWorking(this.local)) {
      label = '搭建中:小火堆';
      progress = this.campfire.getProgress(this.local);""")

if fails:
    print("FAILED:")
    for f in fails:
        print(" -", f)
    sys.exit(1)
open(p, 'w', encoding='utf8', newline='\n').write(s)
print("ok")
