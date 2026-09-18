import { RESEARCH_INGREDIENT_NAMES, type ResearchIngredient } from './ResearchIngredients';

export type HiddenFoodShape = 'cake' | 'pie' | 'flatbread' | 'soup' | 'plate' | 'roll' | 'skewer' | 'pumpkin';
export type HiddenFoodVisual = {
  shape: HiddenFoodShape;
  garnish: ResearchIngredient;
  color: string;
  accent: string;
};

function recipe<K extends string>(kind: K, name: string, cost: Partial<Record<ResearchIngredient, number>>,
  stats: readonly [number, number, number], clue: string,
  shape: HiddenFoodShape, garnish: ResearchIngredient, color: string, accent: string) {
  const research = Object.keys(cost) as ResearchIngredient[];
  return { kind, name, cost, research, clue,
    hint: `试试${research.map(k => RESEARCH_INGREDIENT_NAMES[k]).join('、')}，各一份。`,
    hunger: stats[0], thirst: stats[1], health: stats[2],
    visual: { shape, garnish, color, accent } satisfies HiddenFoodVisual,
  };
}

/** 料理、图鉴、图标与模型共同使用此表，ID 也是持久化标识。 */
export const HIDDEN_RECIPES = [
  recipe('strawberryCake', '草莓奶糕', { flour: 2, strawberry: 2, milk: 1 }, [42, 12, 15], '柔软的面点里，藏着红色小果和羊奶的香气。', 'cake', 'strawberry', '#df8d9d', '#fff0d9'),
  recipe('applePie', '苹果派', { flour: 2, fruitFruit: 3 }, [35, 8, 10], '树上摘下的脆甜果实，也许能成为面皮里的馅。', 'pie', 'fruitFruit', '#cf9952', '#f3d79b'),
  recipe('meatPie', '鲜肉馅饼', { flour: 2, gameMeat: 2, carrot: 1, pepper: 1 }, [65, 5, 25], '面皮裹住兽肉，加一点橙色菜根和辣味，会怎样？', 'pie', 'gameMeat', '#a6744d', '#e9c58b'),
  recipe('berryPancake', '浆果薄饼', { flour: 2, berry: 3 }, [30, 6, 8], '灌木上的小果压出酸甜汁，给薄薄的面饼染个色。', 'flatbread', 'berry', '#c66a80', '#e9bd79'),
  recipe('pumpkinMilkCake', '南瓜奶饼', { flour: 2, pumpkin: 1, cowMilk: 1 }, [44, 12, 14], '橙色瓜瓤揉进面团，再添一点野牛的奶香。', 'cake', 'pumpkin', '#e8a342', '#fff0ce'),
  recipe('sweetPotatoCake', '红薯软糕', { flour: 1, sweetPotato: 2 }, [40, 3, 8], '地里挖出的甜薯与磨好的粉，能捏成柔软的小糕。', 'cake', 'sweetPotato', '#c88755', '#f3d08a'),
  recipe('cornPancake', '玉米煎饼', { flour: 1, corn: 2 }, [36, 3, 7], '金黄籽粒落进面糊，烙出带颗粒的饼。', 'flatbread', 'corn', '#e2b341', '#f6dd8c'),
  recipe('carrotMilkCake', '胡萝卜奶糕', { flour: 2, carrot: 2, milk: 1 }, [46, 10, 15], '橙色菜根藏进面糕，羊圈送来最后一缕奶香。', 'cake', 'carrot', '#dc964f', '#fff0d5'),
  recipe('pineBiscuit', '松香脆饼', { flour: 2, pineFruit: 3 }, [28, 0, 10], '松树落下的果实去壳取仁，拌进面粉烤得酥脆。', 'flatbread', 'pineFruit', '#be8c55', '#ead1a0'),
  recipe('acornSoyCake', '橡果豆饼', { flour: 1, oakFruit: 2, soybean: 2 }, [38, 2, 12], '林间的小橡果和田里的豆子，藏进同一块面饼。', 'flatbread', 'oakFruit', '#a68152', '#dbc28c'),
  recipe('mixedFruitMilkPie', '双果奶派', { flour: 2, fruitFruit: 1, berry: 2, cowMilk: 1 }, [48, 14, 16], '树上脆果与灌木酸果做馅，面皮带着野牛的奶香。', 'pie', 'fruitFruit', '#c9855e', '#eee0b3'),
  recipe('strawberrySweetPotatoCake', '草莓红薯糕', { flour: 1, strawberry: 2, sweetPotato: 1 }, [42, 8, 12], '红色田间小果盖在甜薯面糕上。', 'cake', 'strawberry', '#d9778b', '#ebc286'),
  recipe('tomatoCornFlatbread', '番茄玉米面饼', { flour: 2, tomato: 1, corn: 1 }, [42, 8, 10], '面饼上铺红色多汁菜果，再撒金黄籽粒。', 'flatbread', 'tomato', '#d7744b', '#efce78'),
  recipe('pumpkinMilkSoup', '南瓜奶汤', { pumpkin: 2, cowMilk: 1 }, [30, 35, 15], '橙色瓜瓤慢慢煮软，倒入野牛的鲜奶。', 'soup', 'pumpkin', '#e7b354', '#78968b'),
  recipe('cornSoySoup', '玉米豆羹', { corn: 2, soybean: 1 }, [32, 24, 10], '金黄籽粒与圆豆同煮，熬成一碗粗粮羹。', 'soup', 'corn', '#d8bb70', '#9b8377'),
  recipe('tomatoPotatoSoup', '番茄土豆汤', { tomato: 2, potato: 1 }, [28, 28, 10], '红色多汁菜果与淡色地下块茎，在锅里相遇。', 'soup', 'tomato', '#d88457', '#789c9b'),
  recipe('cabbageShrimpSoup', '卷心菜虾汤', { cabbage: 2, shrimp: 1 }, [26, 30, 14], '层层菜叶包住水中的弯身小客人。', 'soup', 'shrimp', '#d9c995', '#7a9c82'),
  recipe('carrotGoatMilkSoup', '胡萝卜羊奶羹', { carrot: 2, milk: 1 }, [28, 35, 14], '橙色菜根煮成细泥，用羊奶调匀。', 'soup', 'carrot', '#e4b174', '#8caaa0'),
  recipe('crabCornSoup', '蟹肉玉米羹', { crabMeat: 2, corn: 1, cowMilk: 1 }, [36, 32, 18], '拆出的蟹肉遇上金黄籽粒，野牛鲜奶让汤更浓。', 'soup', 'crabMeat', '#edd8a0', '#7699ae'),
  recipe('appleSweetPotatoSoup', '苹果红薯甜汤', { fruitFruit: 2, sweetPotato: 1 }, [30, 24, 9], '树上的脆甜与地下的软甜，煮进同一碗汤。', 'soup', 'fruitFruit', '#d3aa6e', '#b78677'),
  recipe('gardenVegetableSoup', '田园四色汤', { tomato: 1, cabbage: 1, carrot: 1, pumpkin: 1 }, [34, 32, 16], '红果、层层绿叶、橙色菜根和大瓜，凑齐菜园的四色。', 'soup', 'cabbage', '#d49b5b', '#8d9871'),
  recipe('milkyMashedPotato', '奶香土豆泥', { potato: 2, cowMilk: 1 }, [44, 16, 12], '淡色薯块压成泥，拌上野牛的奶香。', 'plate', 'potato', '#e9d29c', '#749d97'),
  recipe('tomatoEggplantStew', '番茄焖茄子', { tomato: 2, eggplant: 2 }, [32, 16, 10], '红色多汁菜果与紫皮长菜，一起焖到软烂。', 'plate', 'eggplant', '#896580', '#bb8b72'),
  recipe('spicyThreeVegetables', '香辣三蔬', { potato: 1, eggplant: 1, pepper: 1 }, [38, 0, 12], '淡色薯块和紫皮菜需要一点辣味提神。', 'plate', 'pepper', '#c67a49', '#839a80'),
  recipe('cabbageSoyParcel', '卷心菜豆包', { cabbage: 2, soybean: 2 }, [34, 12, 12], '不用面皮，用层层菜叶裹住豆馅。', 'roll', 'soybean', '#a6b976', '#ead4a9'),
  recipe('doubleTuberStew', '双薯焖锅', { potato: 1, sweetPotato: 1, carrot: 1 }, [46, 6, 10], '两种地下薯块，一甜一淡，再配橙色菜根。', 'plate', 'sweetPotato', '#d49659', '#9d8b77'),
  recipe('soyStuffedPumpkin', '南瓜酿豆', { pumpkin: 2, soybean: 2 }, [42, 10, 14], '挖空橙色大瓜，把田里的豆子装进去。', 'pumpkin', 'soybean', '#d9923e', '#f2ca78'),
  recipe('pineCornMedley', '松仁玉米', { pineFruit: 2, corn: 2 }, [30, 4, 10], '松果去壳取仁，和金黄籽粒铺满小盘。', 'plate', 'corn', '#e7be55', '#759790'),
  recipe('spicyCabbagePot', '香辣卷心菜煲', { cabbage: 2, tomato: 1, pepper: 1 }, [30, 10, 12], '叶菜在红色菜果汁里煮软，最后添一口辣。', 'soup', 'cabbage', '#c87e51', '#a47d69'),
  recipe('potatoMeatStew', '土豆炖肉', { gameMeat: 2, potato: 2 }, [66, 18, 26], '猎来的肉与淡色薯块，适合慢慢炖成一锅。', 'soup', 'gameMeat', '#b17b52', '#788e83'),
  recipe('tomatoBirdStew', '番茄烩鸟肉', { birdMeat: 2, tomato: 2 }, [40, 16, 16], '飞鸟留下的肉，浸在红色多汁菜果熬出的汁里。', 'plate', 'birdMeat', '#ce8a5d', '#759e9b'),
  recipe('spicyMeatSkewers', '香辣肉串', { gameMeat: 2, pepper: 1 }, [54, 0, 20], '大块猎物肉配上田间最辣的一口。', 'skewer', 'pepper', '#b8754d', '#efd197'),
  recipe('pumpkinBirdStew', '南瓜炖鸟肉', { birdMeat: 2, pumpkin: 1, carrot: 1 }, [48, 12, 20], '飞鸟的肉搭上橙色瓜瓤与细长菜根。', 'soup', 'birdMeat', '#d5a35f', '#91a080'),
  recipe('cabbageMeatRolls', '卷心菜肉卷', { gameMeat: 2, cabbage: 2 }, [56, 16, 24], '宽大的层层菜叶，正好卷住猎来的肉。', 'roll', 'gameMeat', '#91ae74', '#e9d6ae'),
  recipe('appleMeatBraise', '苹果焖肉', { gameMeat: 2, fruitFruit: 2 }, [54, 14, 22], '树上脆甜的果汁，也能焖香猎物肉。', 'plate', 'gameMeat', '#b9865d', '#8c9e97'),
  recipe('birdVegetablePie', '鸟肉蔬菜馅饼', { flour: 2, birdMeat: 2, cabbage: 1, corn: 1 }, [58, 6, 22], '面皮里藏飞鸟肉、层层菜叶与金黄籽粒。', 'pie', 'birdMeat', '#c09259', '#ebc98c'),
  recipe('tomatoSardinePot', '番茄沙丁鱼煲', { sardine: 2, tomato: 2 }, [44, 24, 22], '成群的沙丁小鱼，适合在红色菜果汁里慢煮。', 'soup', 'sardine', '#d28b5e', '#739c9a'),
  recipe('pepperShrimp', '香辣虾', { shrimp: 2, pepper: 1 }, [38, 2, 18], '弯身的小虾，遇上田里最辣的果实。', 'plate', 'shrimp', '#df967c', '#829b86'),
  recipe('crabPotatoCake', '蟹肉土豆饼', { flour: 1, crabMeat: 2, potato: 1 }, [44, 4, 16], '蟹肉拌进薯泥，用一点面粉压成小饼。', 'flatbread', 'crabMeat', '#dbad6a', '#efcf8e'),
  recipe('cabbagePerchSoup', '卷心菜鲈鱼汤', { perch: 2, cabbage: 1 }, [34, 38, 24], '鲈鱼与层层菜叶同煮，留住一碗鲜汤。', 'soup', 'perch', '#d8d6ac', '#829cb0'),
  recipe('cuttlefishCornCake', '墨鱼玉米煎饼', { flour: 2, cuttlefish: 1, corn: 1 }, [48, 6, 20], '会喷墨的海客切碎，与金黄籽粒拌进面糊。', 'flatbread', 'cuttlefish', '#9a827d', '#dbc78d'),
  recipe('pumpkinGrouperPot', '南瓜石斑煲', { grouper: 1, pumpkin: 1, tomato: 1 }, [52, 30, 28], '带斑纹的大鱼配橙色瓜瓤，再添红色菜果的酸香。', 'soup', 'grouper', '#dca060', '#858f78'),
  recipe('islandSeafoodPot', '海岛什锦鱼锅', { yellowCroaker: 1, shrimp: 1, crabMeat: 1, cabbage: 1 }, [56, 36, 30], '金黄小鱼、弯身虾、拆出的蟹肉与层层菜叶，聚成一锅。', 'soup', 'yellowCroaker', '#e1b87a', '#738eac'),
 ] as const;

export type HiddenRecipe = (typeof HIDDEN_RECIPES)[number];
export type HiddenFood = HiddenRecipe['kind'];

/** 从完整目录生成穷尽的注册表，避免新增料理漏接模型或道具。 */
export function hiddenRecipeRecord<T>(create: (recipe: HiddenRecipe) => T): Record<HiddenFood, T> {
  return Object.fromEntries(HIDDEN_RECIPES.map(r => [r.kind, create(r)])) as Record<HiddenFood, T>;
}
