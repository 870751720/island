import * as THREE from 'three';
import { EQUIPMENT, type EquipKind, type EquipSlot } from '../../systems/Equipment';
import { BOY_SHIRT_COLOR, BOY_SHORTS_COLOR, type createBoyModel } from '../BoyModel';
import {
  makeOutfitBackpack, makeOutfitHat, makeOutfitShirt, makeOutfitSleeve,
  makeOutfitTrouserLeg, makeOutfitWaist, type OutfitTier,
} from './OutfitModels';

type BoyModel = ReturnType<typeof createBoyModel>;

/** 同一套挂载逻辑服务本地和远程玩家；只创建已穿装备，换下即释放。 */
export class BoyWardrobe {
  private worn = new Map<EquipSlot, { kind: EquipKind; parts: THREE.Group[] }>();

  constructor(private boy: BoyModel) {}

  setEquip(slot: EquipSlot, kind: EquipKind | null): void {
    if (kind && EQUIPMENT[kind].slot !== slot) return;
    if ((this.worn.get(slot)?.kind ?? null) === kind) return;
    this.clear(slot);
    if (slot === 'clothing') {
      this.boy.torsoMaterial.color.set(kind ? EQUIPMENT[kind].bodyColor! : BOY_SHIRT_COLOR);
    } else if (slot === 'pants') {
      this.boy.legMaterial.color.set(kind ? EQUIPMENT[kind].bodyColor! : BOY_SHORTS_COLOR);
    }
    if (!kind) return;
    const tier = Math.floor((EQUIPMENT[kind].score - 1) / 2) as OutfitTier;
    const parts: THREE.Group[] = [];
    const attach = (parent: THREE.Object3D, part: THREE.Group) => {
      parent.add(part);
      parts.push(part);
    };
    switch (slot) {
      case 'hat': attach(this.boy.head, makeOutfitHat(tier)); break;
      case 'backpack': attach(this.boy.root, makeOutfitBackpack(tier)); break;
      case 'clothing':
        attach(this.boy.root, makeOutfitShirt(tier));
        for (const arm of this.boy.arms) attach(arm, makeOutfitSleeve(tier));
        break;
      case 'pants':
        attach(this.boy.root, makeOutfitWaist(tier));
        this.boy.legs.forEach((leg, i) => attach(leg, makeOutfitTrouserLeg(tier, i === 0 ? -1 : 1)));
        break;
    }
    this.worn.set(slot, { kind, parts });
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
