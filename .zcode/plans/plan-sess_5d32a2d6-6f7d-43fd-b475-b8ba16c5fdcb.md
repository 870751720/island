## 水洼/海水分域钓鱼 + 新增鱼种

### 分配表(最终确认)

| 水域 | 小鱼(二档) | 大鱼(三档) |
|---|---|---|
| 水洼 | 鲈鱼、虾、泥鳅、河豚、蟹肉 | 鲶鱼、**草鱼(新)** |
| 海水 | 沙丁鱼、乌贼、**带鱼、秋刀鱼、小黄鱼、竹荚鱼、鳀鱼(新×5)** | 石斑鱼、剑鱼、蝠鲼 |

杂物(一档)与珍宝(四档)两边共用同一池;珍宝保底(已抽中降权、集齐重置)不变。

### 新增 6 个鱼种

| ID | 名称 | 造型 | 主色 | 体型 |
|---|---|---|---|---|
| hairtail | 带鱼 | long | `#cfd8dc` | 1.0 |
| saury | 秋刀鱼 | long | `#7d97a8` | 1.0 |
| yellowCroaker | 小黄鱼 | fish | `#e3c56d` | 0.9 |
| horseMackerel | 竹荚鱼 | fish | `#8ba3a0` | 0.9 |
| anchovy | 鳀鱼 | fish | `#a9c3cc` | 0.7(权重偏高,定位海产小杂鱼) |
| grassCarp | 草鱼 | fish | `#7ba05b` | 1.5(三档) |

### 改动点

1. **`src/game/systems/Items.ts`**:新增 6 个 `ResourceKind` 与道具定义(名称、鱼类分类、食用值参照现有鲈鱼/沙丁鱼档位),存档向后兼容,`SAVE_VERSION` 不变。
2. **`src/game/systems/FishTable.ts`**:`TIER_LOOT` 拆分为共用池(1、4 档)+ `SEA_FISH` / `POND_FISH`(2、3 档);`rollLoot(tier, waterKind, drawnTreasures?)` 增加水域参数。
3. **`src/game/systems/FishingSystem.ts`**:`traceFacingWater()` / `findBobberTarget()` 保留 `getWaterKind()` 返回的 `'sea' | 'pond'`,`start()` 记录并传入 `rollLoot`。
4. **`src/game/systems/DropModels.ts`**:如战利品模型按 kind 生成,需为新鱼种补造型映射(沿用现有 shape/color 机制)。
5. **文档**:更新 `docs/fishing.md`,写入分域钓池、分配表与新增鱼种。

### 联机

rollTier/rollLoot 与入库均在房主端 PlayerSession 的 FishingSystem 内完成,分域后天然房主权威;客人端只表现不 roll,无需新增同步字段。`docs/multiplayer.md` 无需改动。

### 验收

类型检查/构建通过 → 提交 push → 等 GitHub Actions 部署成功并 curl 200 → 交付线上链接与摘要。