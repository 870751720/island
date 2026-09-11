import * as THREE from 'three';
import { EQUIPMENT, type EquipKind, type EquipSlot } from '../../systems/Equipment';
import { PLAYER_COLORS, type PlayerGender, type createPlayerModel } from '../PlayerModel';
import {
  makeOutfitBackpack, makeOutfitHat, makeOutfitShirt, makeOutfitSleeve,
  makeOutfitTrouserLeg, makeOutfitWaist, type OutfitTier,
} from './OutfitModels';

type PlayerModel = ReturnType<typeof createPlayerModel>;

/** 同一套挂载逻辑服务本地和远程玩家；只创建已穿装备，换下即释放。 */
export class PlayerWardrobe {
  private gender: PlayerGender = 'boy';
  private preview = false;
  private worn = new Map<EquipSlot, { kind: EquipKind; parts: THREE.Group[] }>();

  constructor(private model: PlayerModel) {}

  setGender(gender: PlayerGender): void {
    this.gender = gender;
    if (!this.worn.has('clothing')) this.model.torsoMaterial.color.set(PLAYER_COLORS[gender].shirt);
    if (!this.worn.has('pants')) this.model.legMaterial.color.set(PLAYER_COLORS[gender].shorts);
  }

  setEquip(slot: EquipSlot, kind: EquipKind | null): void {
    if (kind && EQUIPMENT[kind].slot !== slot) return;
    if ((this.worn.get(slot)?.kind ?? null) === kind) return;
    this.clear(slot);
    if (slot === 'clothing') {
      this.model.torsoMaterial.color.set(kind ? EQUIPMENT[kind].bodyColor! : PLAYER_COLORS[this.gender].shirt);
    } else if (slot === 'pants') {
      this.model.legMaterial.color.set(kind ? EQUIPMENT[kind].bodyColor! : PLAYER_COLORS[this.gender].shorts);
    }
    if (!kind) return;
    const tier = Math.floor((EQUIPMENT[kind].score - 1) / 2) as OutfitTier;
    const parts: THREE.Group[] = [];
    const attach = (parent: THREE.Object3D, part: THREE.Group) => {
      if (parent === this.model.upperBody) part.position.y -= 0.59;
      part.visible = !this.model.isBoyPreview;
      parent.add(part);
      parts.push(part);
    };
    switch (slot) {
      case 'hat': attach(this.model.head, makeOutfitHat(tier)); break;
      case 'backpack': attach(this.model.upperBody, makeOutfitBackpack(tier)); break;
      case 'clothing':
        attach(this.model.upperBody, makeOutfitShirt(tier));
        for (const arm of this.model.arms) attach(arm, makeOutfitSleeve(tier));
        break;
      case 'pants':
        attach(this.model.root, makeOutfitWaist(tier));
        this.model.legs.forEach((leg, i) => attach(leg, makeOutfitTrouserLeg(tier, i === 0 ? 1 : -1)));
        break;
    }
    this.worn.set(slot, { kind, parts });
  }

  /** 整套 GM 造型预览隐藏穿搭网格，装备属性与持有状态不变。 */
  syncPreview(): void {
    if (this.preview === this.model.isBoyPreview) return;
    this.preview = this.model.isBoyPreview;
    for (const { parts } of this.worn.values()) for (const part of parts) part.visible = !this.preview;
  }

  private clear(slot: EquipSlot): void {
    for (const part of this.worn.get(slot)?.parts ?? []) {
      part.removeFromParent();
      part.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) material.dispose();
        }
      });
    }
    this.worn.delete(slot);
  }

  dispose(): void {
    for (const slot of [...this.worn.keys()]) this.clear(slot);
  }
}
