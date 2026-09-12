'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useEffect, useRef } from 'react';
import type { Game } from '@/game/Game';
import type { HudSnapshot } from '@/game/GameContracts';
import { EMOJIS } from '@/game/social/Emojis';
import { currentPromptCard } from './promptActions';
import type { FacilityPanelKey } from './useFacilityPanels';

/** Q 长按弹出选择面板的判定时长,与触屏工具按钮长按一致 */
const TOOL_HOLD_MS = 350;
/** 数字键 1~4 对应的表情下标(与长按选择面板顶部表情区顺序一致) */
const EMOJI_KEYS = ['1', '2', '3', '4'];

/** 桌面端键盘快捷键(触屏操作的补充,见 docs/desktop-shortcuts.md):
 * B 开关背包、Q 切工具/长按弹选择面板、1~4 发表情、M 开关地图、Esc 关闭弹层或打开设置、
 * F 触发当前提示卡、G 触发进食卡「吃饱」。监听只挂一次,状态经 latest ref 读取,
 * 避免 HUD 快照高频更新导致重挂监听、打断 Q 长按计时。 */
export function useKeyboardShortcuts({
  gameRef,
  hud,
  photoMode,
  settingsOpen,
  gmOpen,
  backpackOpen,
  placePickerOpen,
  mapOpen,
  facilityPanels,
  setBackpackOpen,
  setSettingsOpen,
  setPlacePickerOpen,
  openMap,
  closeMap,
  closeGm,
  closePanel,
  exitPhotoMode,
}: {
  gameRef: RefObject<Game | null>;
  hud: HudSnapshot;
  photoMode: boolean;
  settingsOpen: boolean;
  gmOpen: boolean;
  backpackOpen: boolean;
  placePickerOpen: boolean;
  mapOpen: boolean;
  facilityPanels: Record<FacilityPanelKey, boolean>;
  setBackpackOpen: Dispatch<SetStateAction<boolean>>;
  setSettingsOpen: Dispatch<SetStateAction<boolean>>;
  setPlacePickerOpen: Dispatch<SetStateAction<boolean>>;
  openMap: () => void;
  closeMap: () => void;
  closeGm: () => void;
  closePanel: (panel: FacilityPanelKey) => void;
  exitPhotoMode: () => void;
}) {
  const latest = useRef({
    gameRef,
    hud,
    photoMode,
    settingsOpen,
    gmOpen,
    backpackOpen,
    placePickerOpen,
    mapOpen,
    facilityPanels,
    setBackpackOpen,
    setSettingsOpen,
    setPlacePickerOpen,
    openMap,
    closeMap,
    closeGm,
    closePanel,
    exitPhotoMode,
  });
  latest.current = {
    gameRef,
    hud,
    photoMode,
    settingsOpen,
    gmOpen,
    backpackOpen,
    placePickerOpen,
    mapOpen,
    facilityPanels,
    setBackpackOpen,
    setSettingsOpen,
    setPlacePickerOpen,
    openMap,
    closeMap,
    closeGm,
    closePanel,
    exitPhotoMode,
  };

  // Q 键长按状态:按住起计时,超时弹出选择面板并吞掉短按;提前抬起走切换工具
  const toolHold = useRef<{ timer: number | null; fired: boolean }>({ timer: null, fired: false });

  useEffect(() => {
    // 输入控件聚焦时按键交给控件(GM/设置面板的文本框),快捷键不拦截
    const isTypingTarget = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      return (
        !!el &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
      );
    };
    // 全屏弹层(拍照/设置/GM)或死亡期间,玩法快捷键全部让位
    const gameplayBlocked = (): boolean => {
      const s = latest.current;
      return s.photoMode || s.settingsOpen || s.gmOpen || s.hud.dead;
    };

    const startToolHold = (): void => {
      const hold = toolHold.current;
      if (hold.timer !== null) return; // 按住中的自动重复
      hold.fired = false;
      hold.timer = window.setTimeout(() => {
        hold.timer = null;
        hold.fired = true;
        // 与工具按钮一致:移动/交互中(按钮淡出)不弹选择面板
        if (!latest.current.hud.busy) latest.current.setPlacePickerOpen(true);
      }, TOOL_HOLD_MS);
    };
    const endToolHold = (fireTap: boolean): void => {
      const hold = toolHold.current;
      if (hold.timer !== null) {
        clearTimeout(hold.timer);
        hold.timer = null;
        if (fireTap && !gameplayBlocked()) latest.current.gameRef.current?.cycleTool();
      }
      hold.fired = false;
    };

    const onKeyDown = (e: KeyboardEvent): void => {
      if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const s = latest.current;

      // Esc:逐层关闭已打开的弹层,全部关闭后再按才作为设置按钮的键盘入口
      if (e.key === 'Escape') {
        const openFacility = (Object.keys(s.facilityPanels) as FacilityPanelKey[]).find(
          (key) => s.facilityPanels[key]
        );
        if (s.photoMode) s.exitPhotoMode();
        else if (s.settingsOpen) s.setSettingsOpen(false);
        else if (s.gmOpen) s.closeGm();
        else if (openFacility) s.closePanel(openFacility);
        else if (s.placePickerOpen) s.setPlacePickerOpen(false);
        else if (s.backpackOpen) s.setBackpackOpen(false);
        else if (s.mapOpen) s.closeMap();
        else if (!s.hud.dead) s.setSettingsOpen(true);
        return;
      }

      if (e.repeat || gameplayBlocked()) return;
      const game = s.gameRef.current;
      switch (e.key.toLowerCase()) {
        case 'b':
          s.setBackpackOpen((v) => !v);
          break;
        case 'm':
          if (s.mapOpen) s.closeMap();
          else s.openMap();
          break;
        case 'q':
          startToolHold();
          break;
        case 'f': {
          // 触发当前可见的那张提示卡(捡回 > 进食 > 手搓),与卡片点击等价
          const card = currentPromptCard(s.hud, s.backpackOpen);
          if (!card || !game) return;
          if (card.card === 'drop') game.pickupDrop();
          else if (card.card === 'eat') game.eatFood();
          else game.craftTool(card.recipe.id);
          break;
        }
        case 'g':
          if (currentPromptCard(s.hud, s.backpackOpen)?.card === 'eat') game?.eatUntilFull();
          break;
        default: {
          const emojiIndex = EMOJI_KEYS.indexOf(e.key);
          if (emojiIndex >= 0 && game) game.playEmoji(EMOJIS[emojiIndex].glyph);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.key.toLowerCase() !== 'q') return;
      endToolHold(true);
    };
    // 切出页面收不到 keyup:按住状态作废(不触发短按切换)
    const onBlur = (): void => endToolHold(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      endToolHold(false);
    };
  }, []);
}
