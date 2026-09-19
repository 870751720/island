'use client';
import type { CompanionKind } from '@/game/companions/CompanionDefinition';
import type { GameMode } from '@/game/GameMode';
import { gameButtonClickAudio, gameButtonPointerAudio } from './gameButtonAudio';

import type { PickerPress } from './usePickerDrag';

import type { CraftId } from '@/game/systems/Crafting';

import { ItemIcon } from './ItemIcon';
import { ITEMS } from '@/game/systems/Items';
import { useEffect, useState } from 'react';
import type { NetGuest } from '@/game/net/NetGuest';
import { QuestRewardFlight } from './QuestRewardFlight';
import { CompanionRewardFlight } from './CompanionRewardFlight';
import { QuestFeedback } from './QuestFeedback';
import { VitalWarn } from './VitalWarn';
import { Hud } from './Hud';
import { HudIcon } from './hud/HudIcon';
import { hudStyles } from './hud/styles';
import { gameThemeCss, gameTheme } from './gameTheme';
import { Backpack } from './Backpack';
import { VirtualJoystick } from './VirtualJoystick';
import { DiagnosticCapture } from './DiagnosticCapture';
import { PerformanceOverlay } from './gm/PerformanceOverlay';
import { FpsOverlay } from './FpsOverlay';
import { TrafficOverlay } from './TrafficOverlay';
import { ToolButton } from './ToolButton';
import { useToolHint } from './useToolHint';
import { PlacePicker } from './PlacePicker';
import { CraftPrompt } from './CraftPrompt';
import { WorkbenchPanel } from './WorkbenchPanel';
import { CampfirePanel } from './CampfirePanel';
import { CratePanel } from './CratePanel';
import { BaitBarrelPanel } from './BaitBarrelPanel';
import { BrewBarrelPanel } from './BrewBarrelPanel';
import { SmelterPanel } from './SmelterPanel';
import { CookingStationPanel } from './CookingStationPanel';
import { LoomPanel } from './LoomPanel';
import { ResearchTablePanel } from './ResearchTablePanel';
import { MillPanel } from './MillPanel';
import { EatPrompt } from './EatPrompt';
import { FishingControls } from './FishingControls';
import { TreasureWheel } from './TreasureWheel';
import { DropPrompt } from './DropPrompt';
import { Notice } from './Notice';
import { DeathScreen } from './DeathScreen';
import { GmPanel } from './gm/GmPanel';
import { BottleMessage } from './BottleMessage';
import { SettingsPanel } from './SettingsPanel';
import { WikiPanel } from './wiki/WikiPanel';
import { PhotoMode } from './PhotoMode';
import { NetHost } from '@/game/net/NetHost';
import { fadeStyle } from './fade';
import { pressAction } from './pressAction';
import { useHudInteraction } from './useHudInteraction';
import { MapSurface, MapPanel } from './MapPanel';
import type { SaveData } from '@/game/systems/SaveSystem';
import { isNearbyFacilityDiggable } from './facilityInteraction';
import { useFacilityPanels } from './useFacilityPanels';
import { createPlacePickerItems } from './placePickerItems';
import { EMOJIS } from '@/game/social/Emojis';
import { getPromptVisibility } from './promptVisibility';
import { useGameLifecycle } from './useGameLifecycle';
import { useMapSnapshot } from './useMapSnapshot';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useCraftPromptHistory } from './useCraftPromptHistory';
import { HudLayoutAdjuster } from './hud/HudLayoutAdjuster';
import { useHudLayout } from './hud/useHudLayout';
import type { CSSProperties } from 'react';
import { IslandArrival } from './start/IslandArrival';
import dynamic from 'next/dynamic';

const InitialCloudBackup = process.env.NEXT_PUBLIC_XHS_EXPORT !== '1'
  ? dynamic(() => import('./cloud/InitialCloudBackup'), { ssr: false }) : null;

/**
 * 游戏进行中的完整 UI 与 Game 实例生命周期:
 * 挂载时创建并启动 Game,卸载时销毁;死亡后显示确认弹窗,确认则整体卸载回到开始界面。
 */
export function GameplayUI({
  net,
  initialSave,
  companionKind,
  gameMode,
  onExit,
  onBecomeHost,
  multiplayerEnabled = true,
  initialBackupCode,
}: {
  /** 联机会话(房主或客人);缺省为单机 */
  net?: { host?: NetHost; guest?: NetGuest };
  /** 单机启动时已锁定的存档:null 表示明确开新档,不允许 Game 再读取 localStorage */
  initialSave?: SaveData | null;
  companionKind?: CompanionKind;
  gameMode?: GameMode;
  onExit: () => void;
  /** 单机中途在设置里开启多人模式:把新创建的房主会话交回外层统一托管(退出时一并销毁) */
  onBecomeHost: (host: NetHost) => void;
  /** 小红书离线渠道不展示设置内的多人入口。 */
  multiplayerEnabled?: boolean;
  /** 首次填写存档码并明确同意后，仅为本次入场上传一次。 */
  initialBackupCode?: string;
}) {
  const {
    gameRef,
    containerRef,
    labelRef,
    mumbleRef,
    questFeedbackRef,
    dogEmojiRef,
    vitalWarnRef,
    hud,
    worldReady,
    pickups,
    damagePops,
    bottleMsg,
    companionReward,
    setBottleMsg,
  } = useGameLifecycle({ net, initialSave, gameMode, companionKind });
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [pickerPress, setPickerPress] = useState<PickerPress | null>(null);
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  useEffect(() => { if (!placePickerOpen) setPickerPress(null); }, [placePickerOpen]);
  const showToolHint = useToolHint(placePickerOpen);
  const { panels: facilityPanels, openPanel, closePanel } = useFacilityPanels(hud);
  const [gmOpen, setGmOpen] = useState(false);
  // 游戏内设置面板(音乐音量/返回主界面)
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 游戏图鉴:由设置面板进入,叠在设置之上,关闭后回到设置
  const [wikiOpen, setWikiOpen] = useState(false);
  const [adjustHud, setAdjustHud] = useState(false);
  const { topOffset, setTopOffset } = useHudLayout();
  const topControls = useHudInteraction(hud.busy, adjustHud || settingsOpen);
  // 相机模式:隐藏全部玩法 UI 自由取景拍照,由设置面板进入
  const [photoMode, setPhotoMode] = useState(false);
  const enterPhotoMode = () => {
    const game = gameRef.current;
    if (!game || hud.dead) return;
    game.enterPhotoMode();
    setSettingsOpen(false);
    setPhotoMode(true);
  };
  const exitPhotoMode = () => {
    gameRef.current?.exitPhotoMode();
    setPhotoMode(false);
  };
  // 死亡时强制退出相机模式,回到死亡结算界面
  useEffect(() => {
    if (hud.dead && photoMode) exitPhotoMode();
  }, [hud.dead]);
  const { mapOpen, mapSnapshot, openMap, closeMap } = useMapSnapshot(gameRef, !!(net?.host || net?.guest));
  const { dismissedRecipes, dismiss } = useCraftPromptHistory(!net?.host && !net?.guest);
  const craftFromPrompt = (id: CraftId) => {
    dismiss(id);
    gameRef.current?.craftTool(id);
  };
  useKeyboardShortcuts({
    dismissedRecipes,
    craftFromPrompt,
    gameRef,
    hud,
    photoMode,
    settingsOpen: settingsOpen || adjustHud,
    gmOpen,
    backpackOpen,
    placePickerOpen,
    mapOpen,
    facilityPanels,
    setBackpackOpen,
    setSettingsOpen: value => {
      if (adjustHud) { setAdjustHud(false); setSettingsOpen(true); }
      else setSettingsOpen(value);
    },
    setPlacePickerOpen,
    openMap,
    closeMap,
    closeGm: () => setGmOpen(false),
    closePanel,
    exitPhotoMode,
  });
  // 海神的信:拆开后弹出的信纸,关闭后清空
  const [letterMsg, setLetterMsg] = useState<string | null>(null);
  // 单机中途开启多人模式:创建房间并把已在运行的游戏挂接为房主权威端
  const [mpBusy, setMpBusy] = useState(false);
  const [mpError, setMpError] = useState('');
  const enableMultiplayer = async () => {
    const game = gameRef.current;
    if (!game || mpBusy) return;
    setMpBusy(true);
    setMpError('');
    const host = new NetHost();
    try {
      await host.createRoom();
      game.bindHost(host);
      onBecomeHost(host);
    } catch (error) {
      host.dispose();
      setMpError(error instanceof Error ? error.message : '创建房间失败，请重试');
    } finally {
      setMpBusy(false);
    }
  };

  // 死亡后关闭所有弹出的面板
  useEffect(() => {
    if (hud.dead) {
      setBackpackOpen(false);
      setAdjustHud(false);
    }
  }, [hud.dead]);

  // 持铲子且面前劫持按钮的东西可被挖走时,按钮保持工具模式(不劫持)
  const digHijack =
    hud.tool === 'shovel' &&
    isNearbyFacilityDiggable(hud);
  const promptVisibility = getPromptVisibility(hud, backpackOpen);

  const questWorkbench = hud.nearWorkbench && hud.craftId === null && !digHijack
    && !!hud.quests?.enabled && !hud.quests.finished && hud.quests.guide?.type === 'bench' && hud.workbenchLevel >= hud.quests.guide.level;
  const campfireGuide = hud.quests?.enabled && !hud.quests.finished && !hud.quests.busy
    && hud.quests.guide?.type === 'campfire' ? hud.quests.guide : null;
  const questCampfire = hud.nearCampfire && hud.craftId === null && !digHijack
    && !!campfireGuide?.ready && (campfireGuide.action === 'fuel' || !!hud.campfireInfo?.lit);
  return (
    <div
      ref={containerRef}
      className="gameplay-ui"
      onPointerDownCapture={gameButtonPointerAudio}
      onClickCapture={gameButtonClickAudio}
      style={{ position: 'relative', width: 'calc(100 * var(--game-vw))', height: 'calc(100 * var(--game-vh))', overflow: 'hidden', '--hud-top-offset': `${topOffset}px` } as CSSProperties}
    >
      <style>{hudStyles + gameThemeCss}</style>
      <IslandArrival ready={worldReady} multiplayer={!!(net?.host || net?.guest)} />
      {worldReady && <DiagnosticCapture gameRef={gameRef} />}
      {InitialCloudBackup && initialBackupCode && <InitialCloudBackup code={initialBackupCode} ready={worldReady} gameRef={gameRef} guest={!!net?.guest} />}
      {!hud.dead && !photoMode && (
        <VirtualJoystick
          onChange={(x, z) => gameRef.current?.setJoystick(x, z)}
          onZoom={(factor) => gameRef.current?.zoomGameplayBy(factor)}
          onZoomEnd={() => gameRef.current?.rememberGameplayZoom()}
        />
      )}
      {!photoMode && (
        <>
          <FpsOverlay />
          <PerformanceOverlay getGame={() => gameRef.current} />
          <TrafficOverlay />
              <Hud
                hud={hud}
                idleHidden={hud.busy && !adjustHud && !settingsOpen && !hud.dead && !net?.host && !net?.guest}
                onQuestNavigate={() => gameRef.current?.moveToQuest()}
                rightReserve={mapOpen ? 190 : 100}
              />
        </>
      )}
      {/* 右上角入口：角色闲置时淡出，操作入口后留出阅读时间。 */}
      {!hud.dead && !photoMode && (
        <div
          className="hud-top-edge"
          style={{
            position: 'absolute',
            right: 'max(10px, var(--game-safe-right))',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            zIndex: 20,
          }}
        >
          <button
            {...pressAction(() => { topControls.interact(); setSettingsOpen(true); })}
            aria-label="设置"
            className="hud-control hud-utility hud-settings"
            disabled={topControls.hidden}
            aria-expanded={settingsOpen}
            style={fadeStyle(topControls.hidden)}
          >
            <HudIcon name="settings" size={23} />
          </button>
          {!mapOpen && (
            <button
              {...pressAction(() => { topControls.interact(); openMap(); })}
              aria-label="打开小地图"
              className="hud-control hud-utility hud-map-preview"
              disabled={topControls.hidden}
              style={fadeStyle(topControls.hidden)}
            >
              {mapSnapshot && <MapSurface snapshot={mapSnapshot} compact />}
            </button>
          )}
          {mapOpen && mapSnapshot && (
            <div inert={topControls.hidden} style={fadeStyle(topControls.hidden)}>
              <MapPanel snapshot={mapSnapshot} onClose={() => { topControls.interact(); closeMap(); }} />
            </div>
          )}
        </div>
      )}
      {adjustHud && !hud.dead && <HudLayoutAdjuster value={topOffset} onChange={setTopOffset} onClose={() => { setAdjustHud(false); setSettingsOpen(true); }} />}
      {settingsOpen && (
        <SettingsPanel
          mode={gameRef.current?.gameMode ?? 'survival'}
          modeSettings={mpBusy || net?.host || net?.guest ? undefined : {
            mode: gameRef.current?.gameMode ?? 'survival',
            dead: hud.dead,
            onConvert: () => gameRef.current ? gameRef.current.convertToLeisure() : '游戏尚未就绪，请稍后重试。',
          }}
          onAdjustHud={() => { setSettingsOpen(false); setAdjustHud(true); }}
          onQuestGuide={enabled => gameRef.current?.setQuestGuide(enabled)}
          onApply={(s) => gameRef.current?.setAudioSettings(s)}
          onExit={onExit}
          onClose={() => setSettingsOpen(false)}
          onEnterPhotoMode={enterPhotoMode}
          onOpenWiki={() => setWikiOpen(true)}
          onSecretGmTrigger={() => setGmOpen(true)}
          multiplayer={
            !multiplayerEnabled || net?.guest
              ? undefined
              : {
                  roomCode: net?.host?.roomCode ?? '',
                  busy: mpBusy,
                  error: mpError,
                  onEnable: () => void enableMultiplayer(),
                }
          }
        />
      )}
      {wikiOpen && <WikiPanel onClose={() => setWikiOpen(false)} />}
      {gmOpen && (
        <GmPanel
          onClose={() => setGmOpen(false)}
          actions={{
            getGame: () => gameRef.current,
            setDay: (day) => gameRef.current?.gmSetDay(day),
            setWeather: (type) => gameRef.current?.gmSetWeather(type),
            setConfig: (patch) => gameRef.current?.gmSetConfig(patch),
            giveItem: (kind, count) => gameRef.current?.gmGiveItem(kind, count),
            giveTool: (tool, tier) => gameRef.current?.gmGiveTool(tool, tier),
            spawnAnimal: (species, juvenile) => gameRef.current?.gmSpawnAnimal(species, juvenile),
            triggerCrocodile: () => gameRef.current?.gmTriggerCrocodile(),
            unlockDiscoveries: () => gameRef.current?.gmUnlockDiscoveries(),
          }}
        />
      )}
      {!photoMode && (
        <Backpack
        showCompanion={!net?.guest}
        open={backpackOpen}
        onToggle={() => setBackpackOpen((v) => !v)}
        hud={hud}
        onUseItem={(kind) => {
          if (kind === 'bottle') {
            const msg = gameRef.current?.useBottle();
            if (msg) setBottleMsg(msg);
            setBackpackOpen(false);
            return;
          }
          if (kind === 'letter') {
            const msg = gameRef.current?.useLetter();
            if (msg) setLetterMsg(msg);
            setBackpackOpen(false);
            return;
          }
          // 可放置道具(建筑/丛/神龛/围栏等)使用后拿在手上,走站定安放流程(预览+自动放置)
          if (gameRef.current?.pickPlaceItem(kind)) {
            setBackpackOpen(false);
            return;
          }
          gameRef.current?.eatFood(kind);
          setBackpackOpen(false);
        }}
        onDropItem={(kind, count) => gameRef.current?.dropItem(kind, count)}
        onCraft={(id) => {
          if (gameRef.current?.craftTool(id)) setBackpackOpen(false);
        }}
        onEquip={(kind) => gameRef.current?.equipItem(kind)}
        onUnequip={(slot) => gameRef.current?.unequipItem(slot)}
        onMoveItem={(from, to) => gameRef.current?.moveItem(from, to)}
        onSort={() => gameRef.current?.sortInventory()}
      />
      )}
      {!hud.dead && !photoMode && (
        <>
          {(hud.hasAxe ||
            hud.hasPickaxe ||
            hud.hasShovel ||
            hud.hasHoe ||
            hud.hasFishingrod ||
            hud.hasBow ||
            hud.hasSword ||
            hud.hasLasso ||
            hud.placeables.length > 0 ||
            hud.nearTether ||
            hud.nearWorkbench ||
            hud.nearCampfire ||
            hud.nearCrate ||
            hud.nearBaitBarrel ||
            hud.nearBrewBarrel ||
            hud.nearSmelter ||
            hud.nearCookingStation ||
            hud.nearLoom ||
            hud.nearMill || hud.nearResearchTable ||
            hud.nearBed) && (
            <ToolButton
              crateKind={hud.crateKind ?? 'crate'}
              questHighlight={questWorkbench || questCampfire}
              tool={hud.tool}
              pulse={hud.autoEquipProgress > 0}
              workbench={hud.nearWorkbench && !questCampfire && hud.craftId === null && !digHijack}
              campfire={hud.nearCampfire && (!hud.nearWorkbench || questCampfire) && hud.craftId === null && !digHijack}
              crate={hud.nearCrate && !hud.nearWorkbench && !hud.nearCampfire && hud.craftId === null && !digHijack}
              baitBarrel={
                hud.nearBaitBarrel &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                hud.craftId === null &&
                !digHijack
              }
              brewBarrel={
                hud.nearBrewBarrel &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                hud.craftId === null &&
                !digHijack
              }
              smelter={
                hud.nearSmelter &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                !hud.nearBrewBarrel &&
                hud.craftId === null &&
                !digHijack
              }
              cookingStation={
                hud.nearCookingStation &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                !hud.nearBrewBarrel &&
                !hud.nearSmelter &&
                hud.craftId === null &&
                !digHijack
              }
              loom={
                hud.nearLoom &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                !hud.nearBrewBarrel &&
                !hud.nearSmelter &&
                !hud.nearCookingStation &&
                hud.craftId === null &&
                !digHijack
              }
              mill={
                hud.nearMill &&
                !hud.nearLoom &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                !hud.nearBrewBarrel &&
                !hud.nearSmelter &&
                !hud.nearCookingStation &&
                hud.craftId === null &&
                !digHijack
              }
              researchTable={
                hud.nearResearchTable &&
                !hud.nearMill &&
                !hud.nearLoom &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                !hud.nearBrewBarrel &&
                !hud.nearSmelter &&
                !hud.nearCookingStation &&
                hud.craftId === null &&
                !digHijack
              }
              bed={
                hud.nearBed &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                !hud.nearBrewBarrel &&
                !hud.nearSmelter &&
                !hud.nearCookingStation &&
                !hud.nearLoom &&
                !hud.nearMill && !hud.nearResearchTable &&
                hud.craftId === null &&
                !hud.bedSleeping &&
                !digHijack
              }
              stake={hud.leading}
              untie={
                hud.nearTether &&
                !hud.leading &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                !hud.nearBrewBarrel &&
                !hud.nearSmelter &&
                !hud.nearCookingStation &&
                !hud.nearLoom &&
                !hud.nearMill && !hud.nearResearchTable &&
                !hud.nearBed &&
                hud.craftId === null
              }
              arrowCount={hud.arrow}
              baitCount={hud.bait}
              fenceCount={hud.heldFenceCount}
              placeCount={hud.heldPlaceCount}
              placeKind={hud.heldItemKind}
              lassoCount={hud.lassoCount}
              dimmed={hud.busy && !questWorkbench && !questCampfire}
              showHint={showToolHint}
              onLongPress={(press) => { setPickerPress(press); setPlacePickerOpen(true); }}
              onCycle={() => gameRef.current?.useToolButton()}
              onWorkbench={() => openPanel('workbench')}
              onCampfire={() => openPanel('campfire')}
              onCrate={() => openPanel('crate')}
              onBaitBarrel={() => openPanel('baitBarrel')}
              onBrewBarrel={() => openPanel('brewBarrel')}
              onSmelter={() => openPanel('smelter')}
              onCookingStation={() => openPanel('cookingStation')}
              onLoom={() => openPanel('loom')}
              onMill={() => openPanel('mill')}
              onResearchTable={() => openPanel('researchTable')}
              onBed={() => gameRef.current?.sleep()}
              onStake={() => gameRef.current?.stakeLasso()}
              onUntie={() => gameRef.current?.untieLasso()}
            />
          )}
          {placePickerOpen && (
            <PlacePicker
              press={pickerPress}
              items={createPlacePickerItems(hud)}
              emojis={EMOJIS}
              onPickEmoji={(glyph) => {
                gameRef.current?.playEmoji(glyph);
                setPlacePickerOpen(false);
              }}
              onPick={(entry) => {
                if (entry.tool) gameRef.current?.selectTool(entry.tool);
                else if (entry.kind) gameRef.current?.pickPlaceItem(entry.kind);
                setPlacePickerOpen(false);
              }}
              onClose={() => setPlacePickerOpen(false)}
            />
          )}
          {facilityPanels.workbench && (
            <WorkbenchPanel
              hud={hud}
              onCraft={(id, count) => {
                if (gameRef.current?.craftAtWorkbench(id, count)) closePanel('workbench');
              }}
              onUpgrade={() => !!gameRef.current?.upgradeWorkbench()}
              onClose={() => closePanel('workbench')}
            />
          )}
          {facilityPanels.campfire && hud.nearCampfire && (
            <CampfirePanel
              hud={hud}
              onAddFuel={(kind) => gameRef.current?.campfireAddFuel(kind)}
              onCook={(kind, count) => {
                gameRef.current?.campfireCook(kind, count);
                closePanel('campfire');
              }}
              onClose={() => closePanel('campfire')}
            />
          )}
          {facilityPanels.crate && hud.nearCrate && (
            <CratePanel
              hud={hud}
              onStore={(kind, count) => gameRef.current?.crateStore(kind, count) ?? false}
              onTake={(kind, count) => gameRef.current?.crateTake(kind, count) ?? false}
              onClose={() => closePanel('crate')}
            />
          )}
          {facilityPanels.baitBarrel && hud.nearBaitBarrel && (
            <BaitBarrelPanel
              hud={hud}
              onFeed={(kind, count) => gameRef.current?.baitBarrelFeed(kind, count)}
              onCollect={() => gameRef.current?.baitBarrelCollect()}
              onTakeFoods={() => gameRef.current?.baitBarrelTakeFoods()}
              onClose={() => closePanel('baitBarrel')}
            />
          )}
          {facilityPanels.brewBarrel && hud.nearBrewBarrel && (
            <BrewBarrelPanel
              hud={hud}
              onFeed={(kind, count) => gameRef.current?.brewBarrelFeed(kind, count)}
              onCollect={() => gameRef.current?.brewBarrelCollect()}
              onTakeRaw={() => gameRef.current?.brewBarrelTakeRaw()}
              onClose={() => closePanel('brewBarrel')}
            />
          )}
          {facilityPanels.smelter && hud.nearSmelter && (
            <SmelterPanel
              hud={hud}
              onFeed={(count) => gameRef.current?.smelterFeed(count)}
              onAddFuel={(kind) => gameRef.current?.smelterAddFuel(kind)}
              onCollect={() => gameRef.current?.smelterCollect()}
              onTakeOre={() => gameRef.current?.smelterTakeOre()}
              onClose={() => closePanel('smelter')}
            />
          )}
          {facilityPanels.cookingStation && hud.nearCookingStation && (
            <CookingStationPanel
              hud={hud}
              onAddFuel={(kind) => gameRef.current?.cookingAddFuel(kind)}
              onRoast={(kind, count) => {
                gameRef.current?.cookingRoast(kind, count);
                closePanel('cookingStation');
              }}
              onBoil={(kind, count) => {
                gameRef.current?.cookingBoil(kind, count);
              }}
              onCollect={() => gameRef.current?.cookingCollect()}
              onTakeBoil={() => gameRef.current?.cookingTakeBoil()}
              onClose={() => closePanel('cookingStation')}
            />
          )}
          {facilityPanels.loom && hud.nearLoom && (
            <LoomPanel
              hud={hud}
              onFeed={(count) => gameRef.current?.loomFeed(count)}
              onCollect={() => gameRef.current?.loomCollect()}
              onTakeRope={() => gameRef.current?.loomTakeRope()}
              onClose={() => closePanel('loom')}
            />
          )}
          {facilityPanels.researchTable && hud.nearResearchTable && (
            <ResearchTablePanel hud={hud} onStart={kinds => gameRef.current?.researchStart(kinds) ?? false} onClose={() => closePanel('researchTable')} />
          )}
          {facilityPanels.mill && hud.nearMill && (
            <MillPanel
              hud={hud}
              onFeed={(count) => gameRef.current?.millFeed(count)}
              onCollect={() => gameRef.current?.millCollect()}
              onTakeWheat={() => gameRef.current?.millTakeWheat()}
              onClose={() => closePanel('mill')}
            />
          )}
          <CraftPrompt
            hud={hud}
            onCraft={craftFromPrompt}
            dismissedRecipes={dismissedRecipes}
            suppressed={promptVisibility.dropActive || promptVisibility.eatActive}
          />
          <EatPrompt
            hud={hud}
            onEat={() => gameRef.current?.eatFood()}
            onEatFull={() => gameRef.current?.eatUntilFull()}
            suppressed={promptVisibility.dropActive}
          />
          {!backpackOpen && (
            <DropPrompt hud={hud} onPickup={() => gameRef.current?.pickupDrop()} />
          )}
          <FishingControls
            hud={hud}
            onStart={() => gameRef.current?.startFishing()}
            onHook={() => gameRef.current?.hookFish()}
          />
          <TreasureWheel
            key={hud.treasureKind ?? 'none'}
            kind={hud.treasureKind}
            onClaim={() => gameRef.current?.claimTreasure()}
            onSfx={(name) => gameRef.current?.playUiSfx(name)}
          />
          <TreasureWheel
            key={hud.collectTreasure ? `collect-${hud.collectTreasure}` : 'collect-none'}
            kind={hud.collectTreasure}
            onClaim={() => gameRef.current?.claimCollectTreasure()}
            onSfx={(name) => gameRef.current?.playUiSfx(name)}
          />
          <Notice notice={hud.notice} />
        </>
      )}
      {bottleMsg && <BottleMessage text={bottleMsg} onClose={() => setBottleMsg(null)} />}
      {letterMsg && (
        <BottleMessage text={letterMsg} onClose={() => setLetterMsg(null)} kind="letter" title="海神的信" closeLabel="收好信纸" />
      )}
      {hud.dead && (
        <DeathScreen
          onConfirm={onExit}
          autoRespawn={hud.respawnLeft !== null}
          respawnLeft={hud.respawnLeft}
          deathLoot={hud.deathLoot}
          report={gameRef.current?.deathReport ?? null}
          poseidon={hud.poseidonGrace}
        />
      )}
      {photoMode && !hud.dead && gameRef.current && (
        <PhotoMode game={gameRef.current} day={hud.day} onClose={exitPhotoMode} />
      )}
      {!photoMode && pickups.map((t) => (
        <div key={t.id} className="pickup-toast" style={{ left: t.x, top: t.y }}>
          {t.items.map((item, i) => (
            <span key={i} style={{ marginLeft: i > 0 ? 8 : 0, display: 'inline-flex', alignItems: 'center' }}>
              <ItemIcon kind={item.kind} size={22} />
              <span className="pickup-count">{ITEMS[item.kind].name}×{item.count}</span>
            </span>
          ))}
        </div>
      ))}
      {!photoMode && damagePops.map((d) => (
        <div key={d.id} className="damage-pop" style={{ left: d.x, top: d.y }}>
          -{d.amount}
        </div>
      ))}
      {!photoMode && (
      <div
        ref={labelRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          display: 'none',
          padding: '4px 14px',
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          borderRadius: 20,
          fontFamily: 'sans-serif',
          fontSize: 14,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      )}
      {!photoMode && (
      <div
        ref={mumbleRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          display: 'none',
          maxWidth: 'calc(60 * var(--game-vw))',
          padding: '6px 14px',
          background: gameTheme.panel,
          color: gameTheme.ink,
          borderRadius: 14,
          fontFamily: 'sans-serif',
          fontSize: 14,
          lineHeight: 1.4,
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
          userSelect: 'none',
          // 气泡小尾巴
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 55% 100%, 50% calc(100% + 6px), 45% 100%, 0 100%)',
        }}
      />
      )}
      {!photoMode && (
      <div
        ref={dogEmojiRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          background: gameTheme.panel,
          borderRadius: 999,
          fontFamily: 'sans-serif',
          fontSize: 14,
          lineHeight: 1.2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 30,
        }}
      />
      )}
      <QuestRewardFlight quest={hud.quests} visible={!photoMode && !hud.dead} containerRef={containerRef} />
      <CompanionRewardFlight reward={companionReward} visible={!photoMode && !hud.dead} containerRef={containerRef} />
      <QuestFeedback ref={questFeedbackRef} quest={hud.quests} visible={!photoMode && !hud.dead} />
      {!photoMode && <VitalWarn ref={vitalWarnRef} />}
    </div>
  );
}
