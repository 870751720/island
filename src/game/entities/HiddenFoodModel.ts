import * as THREE from 'three';
import { clayMaterial } from '../world/ClayMaterial';
import { mergeClayMeshes } from '../core/mergeClayMeshes';
import { hiddenRecipe, type HiddenFood } from '../systems/HiddenRecipes';
import { hiddenFoodGarnishes, hiddenIngredientColor } from '../systems/HiddenFoodVisuals';

/** 掉落物与手持共用；八类低面数造型与图标采用同一份配色、配料配置。 */
export function makeHiddenFoodModel(kind: HiddenFood): THREE.Group {
  const recipe = hiddenRecipe(kind)!;
  const { shape, color, accent } = recipe.visual;
  const group = new THREE.Group();
  const add = (shape: THREE.BufferGeometry, color: string, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(shape, clayMaterial(color)); mesh.position.set(x, y, z); mesh.castShadow = true; group.add(mesh); return mesh;
  };
  const cylinder = (top: number, bottom: number, height: number, fill: string, y: number) =>
    add(new THREE.CylinderGeometry(top, bottom, height, 12), fill, 0, y, 0);
  let toppingY = .17;
  if (shape === 'soup' || shape === 'pumpkin') {
    cylinder(.23, .135, .18, shape === 'soup' ? accent : color, .115);
    cylinder(.226, .226, .025, '#f3d9ad', .205);
    cylinder(.20, .20, .012, color, .221);
    toppingY = .235;
    if (shape === 'pumpkin') {
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const rib = add(new THREE.SphereGeometry(.06, 6, 4), '#e5a456', Math.sin(a) * .17, .11, Math.cos(a) * .17);
        rib.scale.set(.65, 1.3, .65);
      }
    }
  } else if (shape === 'cake') {
    cylinder(.19, .19, .16, '#ebca8e', .12);
    cylinder(.193, .193, .035, color, .12);
    cylinder(.195, .195, .035, accent, .216);
    toppingY = .25;
  } else if (shape === 'roll') {
    cylinder(.25, .22, .035, '#d3ddc7', .035);
    for (const x of [-.085, .085]) {
      const roll = add(new THREE.CylinderGeometry(.07, .07, .26, 8), color, x, .105, 0);
      roll.rotation.x = Math.PI / 2;
      const filling = add(new THREE.CylinderGeometry(.045, .045, .012, 8), hiddenIngredientColor(recipe.visual.garnish), x, .105, .134);
      filling.rotation.x = Math.PI / 2;
    }
  } else if (shape === 'skewer') {
    for (const x of [-.075, .075]) {
      const stick = add(new THREE.CylinderGeometry(.012, .012, .48, 5), '#b08a5b', x, .07, 0);
      stick.rotation.x = Math.PI / 2;
      for (const z of [-.13, 0, .13]) {
        const chunk = add(new THREE.BoxGeometry(.10, .10, .09), z === 0 ? '#c96a53' : color, x, .105, z);
        chunk.rotation.y = .3;
      }
    }
  } else if (shape === 'plate') {
    cylinder(.26, .21, .035, accent, .035);
    cylinder(.225, .225, .015, '#f5e6c7', .062);
    const mound = add(new THREE.SphereGeometry(.16, 10, 5), color, 0, .092, 0);
    mound.scale.y = .45;
    toppingY = .16;
  } else {
    cylinder(.23, .21, .025, '#d5dfc9', .025);
    cylinder(.20, .18, .10, '#d7a45f', .087);
    cylinder(.175, .175, .015, color, .144);
    if (shape === 'pie') {
      for (const x of [-.08, 0, .08]) {
        const strip = add(new THREE.BoxGeometry(.026, .018, .28), accent, x, .159, 0);
        strip.rotation.y = .45;
      }
    }
  }
  if (shape !== 'roll' && shape !== 'skewer') {
    hiddenFoodGarnishes(recipe).forEach((ingredient, i) => {
      const x = [-.07, .08, .025][i], z = [-.045, .025, .085][i];
      const fill = hiddenIngredientColor(ingredient);
      if (ingredient === 'shrimp' || ingredient === 'cuttlefish') {
        const ring = add(new THREE.TorusGeometry(.035, .015, 4, 8, ingredient === 'shrimp' ? Math.PI * 1.6 : Math.PI * 2), fill, x, toppingY, z);
        ring.rotation.x = Math.PI / 2;
      } else if (ingredient === 'strawberry' || ingredient === 'berry') {
        const fruit = add(new THREE.SphereGeometry(.038, 6, 4), fill, x, toppingY, z);
        fruit.scale.y = ingredient === 'strawberry' ? 1.2 : .8;
        add(new THREE.BoxGeometry(.035, .01, .025), '#85a76e', x, toppingY + .04, z);
      } else {
        const piece = add(new THREE.BoxGeometry(.075, .035, .055), fill, x, toppingY, z);
        piece.rotation.y = i * .85;
        if (ingredient === 'cabbage') piece.scale.set(1.2, .4, 1.3);
      }
    });
  }
  mergeClayMeshes(group); return group;
}
