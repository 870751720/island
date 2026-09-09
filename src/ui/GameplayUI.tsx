'use client';

import { ItemIcon } from './ItemIcon';
import { ITEMS } from '@/game/systems/Items';
import { useEffect, useRef, useState } from 'react';
import type { NetGuest } from '@/game/net/NetGuest';
import { VitalWarn } from './VitalWarn';
import { Hud } from './Hud';
import { Backpack } from './Backpack';
import { VirtualJoystick } from './VirtualJoystick';
import { FpsOverlay } from './FpsOverlay';
import { TrafficOverlay } from './TrafficOverlay';
import { ToolButton } from './ToolButton';
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
import { EatPrompt } from './EatPrompt';
import { FishingControls } from './FishingControls';
import { TreasureWheel } from './TreasureWheel';
import { DropPrompt } from './DropPrompt';
import { Notice } from './Notice';
import { DeathScreen } from './DeathScreen';
import { GmPanel } from './gm/GmPanel';
import { BottleMessage } from './BottleMessage';
import { SettingsPanel } from './SettingsPanel';
import { PhotoMode } from './PhotoMode';
import { NetHost } from '@/game/net/NetHost';
import { fadeStyle } from './fade';
import { MapIcon, MapPanel } from './MapPanel';
import type { SaveData } from '@/game/systems/SaveSystem';
import { isNearbyFacilityDiggable } from './facilityInteraction';
import { useFacilityPanels } from './useFacilityPanels';
import { createPlacePickerItems } from './placePickerItems';
import { getPromptVisibility } from './promptVisibility';
import { useGameLifecycle } from './useGameLifecycle';
import { useMapSnapshot } from './useMapSnapshot';

/**
 * 游戏进行中的完整 UI 与 Game 实例生命周期:
 * 挂载时创建并启动 Game,卸载时销毁;死亡后显示确认弹窗,确认则整体卸载回到开始界面。
 */
export function GameplayUI({
  net,
  initialSave,
  onExit,
  onBecomeHost,
}: {
  /** 联机会话(房主或客人);缺省为单机 */
  net?: { host?: NetHost; guest?: NetGuest };
  /** 单机启动时已锁定的存档:null 表示明确开新档,不允许 Game 再读取 localStorage */
  initialSave?: SaveData | null;
  onExit: () => void;
  /** 单机中途在设置里开启多人模式:把新创建的房主会话交回外层统一托管(退出时一并销毁) */
  onBecomeHost: (host: NetHost) => void;
}) {
  const {
    gameRef,
    containerRef,
    labelRef,
    mumbleRef,
    dogEmojiRef,
    vitalWarnRef,
    hud,
    worldReady,
    pickups,
    damagePops,
    bottleMsg,
    setBottleMsg,
  } = useGameLifecycle({ net, initialSave });
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  const { panels: facilityPanels, openPanel, closePanel } = useFacilityPanels(hud);
  const [gmOpen, setGmOpen] = useState(false);
  // 游戏内设置面板(音乐音量/返回主界面)
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const { mapOpen, mapSnapshot, openMap, closeMap } = useMapSnapshot(gameRef);
  // 海神的信:拆开后弹出的信纸,关闭后清空
  const [letterMsg, setLetterMsg] = useState<string | null>(null);
  // 连续 5 次点击红心(2 秒内)打开 GM 面板
  const heartTapsRef = useRef<number[]>([]);
  const handleHeartTap = () => {
    const now = performance.now();
    const taps = heartTapsRef.current.filter((t) => now - t < 2000);
    taps.push(now);
    heartTapsRef.current = taps;
    if (taps.length >= 5) {
      heartTapsRef.current = [];
      setGmOpen(true);
    }
  };
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
    }
  }, [hud.dead]);

  // 持铲子且面前劫持按钮的东西可被挖走时,按钮保持工具模式(不劫持)
  const digHijack =
    hud.tool === 'shovel' &&
    isNearbyFacilityDiggable(hud);
  const promptVisibility = getPromptVisibility(hud, backpackOpen);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // 背景取场景天空色,淡出时与首帧画面自然衔接
          background: '#a8d8ea',
          opacity: worldReady ? 0 : 1,
          pointerEvents: worldReady ? 'none' : 'auto',
          transition: 'opacity 0.5s ease-out',
        }}
      >
        <span style={{ color: '#3f6f8f', fontSize: 18, letterSpacing: 4 }}>正在登上小岛…</span>
      </div>
      {!hud.dead && !photoMode && <VirtualJoystick onChange={(x, z) => gameRef.current?.setJoystick(x, z)} />}
      {!photoMode && (
        <>
          <FpsOverlay />
          <TrafficOverlay />
              <Hud
                hud={hud}
                onHeartTap={handleHeartTap}
                rightReserve={mapOpen ? 210 : 120}
              />
        </>
      )}
      {/* 右上角:设置按钮左、地图入口或小地图右；玩家移动/交互中一起淡出 */}
      {!hud.dead && !photoMode && (
        <div
          style={{
            position: 'absolute',
            top: 'max(10px, env(safe-area-inset-top))',
            right: 'max(10px, env(safe-area-inset-right))',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            zIndex: 20,
          }}
        >
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="设置"
            style={{
              width: 44,
              height: 44,
              fontSize: 17,
              lineHeight: 1,
              border: 'none',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.75)',
              cursor: 'pointer',
              ...fadeStyle(hud.busy),
            }}
          >
            ⚙️
          </button>
          {!mapOpen && (
            <button
              onClick={openMap}
              aria-label="打开小地图"
              style={{
                width: 44,
                height: 44,
                padding: 8,
                lineHeight: 1,
                border: 'none',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.82)',
                cursor: 'pointer',
                touchAction: 'manipulation',
                ...fadeStyle(hud.busy),
              }}
            >
              <MapIcon size={28} />
            </button>
          )}
          {mapOpen && mapSnapshot && (
            <div style={fadeStyle(hud.busy)}>
              <MapPanel snapshot={mapSnapshot} onClose={closeMap} />
            </div>
          )}
        </div>
      )}
      {settingsOpen && (
        <SettingsPanel
          onApply={(s) => gameRef.current?.setAudioSettings(s)}
          onExit={onExit}
          onClose={() => setSettingsOpen(false)}
          onEnterPhotoMode={enterPhotoMode}
          multiplayer={
            net?.guest
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
      {gmOpen && (
        <GmPanel
          gender={hud.gender}
          onClose={() => setGmOpen(false)}
          actions={{
            restoreStatus: () => gameRef.current?.gmRestoreStatus(),
            setGender: (gender) => gameRef.current?.gmSetGender(gender),
            setTime: (t) => gameRef.current?.gmSetTime(t),
            setDay: (day) => gameRef.current?.gmSetDay(day),
            setWeather: (type) => gameRef.current?.gmSetWeather(type),
            setConfig: (patch) => gameRef.current?.gmSetConfig(patch),
            giveItem: (kind, count) => gameRef.current?.gmGiveItem(kind, count),
            giveTool: (tool, tier) => gameRef.current?.gmGiveTool(tool, tier),
            spawnAnimal: (species) => gameRef.current?.gmSpawnAnimal(species),
            triggerCrocodile: () => gameRef.current?.gmTriggerCrocodile(),
            placeSoil: () => gameRef.current?.gmPlaceSoil(),
          }}
        />
      )}
      {!photoMode && (
        <Backpack
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
          // 可放置道具(建筑/丛/神龛/围栏等)统一在就近最优格放下,放不下时提示原因
          if (gameRef.current?.useFacilityItem(kind)) {
            setBackpackOpen(false);
            return;
          }
          if (kind === 'oakSeed' || kind === 'pineSeed' || kind === 'fruitSeed') {
            gameRef.current?.useSeed(kind);
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
            hud.hasFishingrod ||
            hud.hasBow ||
            hud.hasSword ||
            hud.hasLasso ||
            hud.nearTether ||
            hud.nearWorkbench ||
            hud.nearCampfire ||
            hud.nearCrate ||
            hud.nearBaitBarrel ||
            hud.nearBrewBarrel ||
            hud.nearSmelter ||
            hud.nearCookingStation ||
            hud.nearLoom ||
            hud.nearBed) && (
            <ToolButton
              tool={hud.tool}
              pulse={hud.autoEquipProgress > 0}
              workbench={hud.nearWorkbench && hud.craftId === null && !digHijack}
              campfire={hud.nearCampfire && !hud.nearWorkbench && hud.craftId === null && !digHijack}
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
                !hud.nearBed &&
                hud.craftId === null
              }
              arrowCount={hud.arrow}
              baitCount={hud.bait}
              fenceCount={hud.heldFenceCount}
              placeCount={hud.heldPlaceCount}
              placeKind={hud.heldItemKind}
              lassoCount={hud.lassoCount}
              dimmed={hud.busy}
              onLongPress={() => setPlacePickerOpen(true)}
              onCycle={() => gameRef.current?.useToolButton()}
              onWorkbench={() => openPanel('workbench')}
              onCampfire={() => openPanel('campfire')}
              onCrate={() => openPanel('crate')}
              onBaitBarrel={() => openPanel('baitBarrel')}
              onBrewBarrel={() => openPanel('brewBarrel')}
              onSmelter={() => openPanel('smelter')}
              onCookingStation={() => openPanel('cookingStation')}
              onLoom={() => openPanel('loom')}
              onBed={() => gameRef.current?.sleep()}
              onStake={() => gameRef.current?.stakeLasso()}
              onUntie={() => gameRef.current?.untieLasso()}
            />
          )}
          {placePickerOpen && (
            <PlacePicker
              items={createPlacePickerItems(hud)}
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
          <CraftPrompt
            hud={hud}
            onCraft={(id) => gameRef.current?.craftTool(id)}
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
        <BottleMessage text={letterMsg} onClose={() => setLetterMsg(null)} icon="📜" title="海神的信" closeLabel="收好信纸" />
      )}
      {hud.dead && (
        <DeathScreen
          onConfirm={onExit}
          autoRespawn={!!(net?.host || net?.guest) || hud.poseidonGrace}
          respawnLeft={hud.respawnLeft}
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
          maxWidth: '60vw',
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.94)',
          color: '#4a3b2a',
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
          padding: '2px 7px',
          background: 'rgba(255,255,255,0.94)',
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
      {!photoMode && <VitalWarn ref={vitalWarnRef} />}
    </div>
  );
}
