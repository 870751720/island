import { hiddenRecipeRecord, type HiddenRecipe } from '@/game/systems/HiddenRecipeCatalog';
import { hiddenFoodGarnishes, hiddenIngredientColor } from '@/game/systems/HiddenFoodVisuals';
import type { ResearchIngredient } from '@/game/systems/ResearchIngredients';

const path = (d: string, fill: string, stroke = 'none', width = 1.6) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
const ellipse = (x: number, y: number, rx: number, ry: number, color: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}"/>`;
const group = (transform: string, body: string) => `<g transform="${transform}">${body}</g>`;
const line = (d: string, color: string, width = 1.6) => path(d, 'none', color, width);
const leaf = path('M-5 2Q-8-9 3-7Q7 0-5 2Z', '#85a572') + line('M-4 1L1-5', '#c7d9a7', 1.2);

/** 小尺寸也能识别的切片、鱼肉和果实；坐标围绕原点，供各类盛器复用。 */
function garnish(kind: ResearchIngredient): string {
  const c = hiddenIngredientColor(kind);
  switch (kind) {
    case 'strawberry':
      return path('M-8-2Q-7-9 0-6Q8-9 9-2Q7 5 0 10Q-7 5-8-2Z', c, '#ad5b66')
        + path('M0-5L-7-10L-4-4L-10-3L-1 0L3-4L9-6L3-7L3-12Z', '#779664')
        + [[-4, 0], [3, 0], [0, 5]].map(([x, y]) => ellipse(x, y, .8, 1.3, '#ffe4b5')).join('');
    case 'berry':
      return [[-5, 2], [4, 3], [0, -4]].map(([x, y]) => ellipse(x, y, 5.5, 5, c)
        + ellipse(x - 1.5, y - 2, 1.7, 1, '#e8b2bc')).join('') + group('translate(3 -7) scale(.7)', leaf);
    case 'fruitFruit':
      return path('M-10-2Q-3 7 10-5L6 6Q-2 13-10-2Z', c, '#b7824d')
        + path('M-8-2Q0 6 8-4L4 4Q-1 9-8-2Z', '#ffe0a2') + ellipse(1, 2, 1, 1.5, '#a97c54');
    case 'shrimp':
      return path('M8-7Q-4-13-10-3Q-14 7-3 11Q5 13 10 5L5 1Q2 7-3 5Q-8 3-4-2Q0-5 5-1Z', c, '#b87766')
        + path('M5 4L13 1L11 7L14 10L7 10Z', '#c7806b')
        + line('M-5-5L-1-1M-9 0L-4 2M-7 7L-2 4M0 10L1 5', '#fff0cd', 1.7);
    case 'sardine': case 'perch': case 'grouper': case 'yellowCroaker':
      return path('M-12 0Q-3-11 9-3L15-7L13 0L15 6L8 3Q-4 10-12 0Z', c, '#758577')
        + path('M-10 1Q0 3 9 0Q-2 8-10 1Z', '#f6dfa8')
        + line('M-1-4L-3 2M4-3L2 3', '#7c886d') + ellipse(-7, -1, 1, 1, '#536359');
    case 'cuttlefish':
      return ellipse(0, 0, 10, 7, c) + ellipse(0, -1, 6, 3.8, '#ead8c8')
        + line('M-4 6L-6 10M1 7L0 11M5 5L8 9', c, 2.4);
    case 'corn':
      return group('rotate(-20)', path('M-9-5Q0-10 9-5L10 5Q0 10-9 5Z', c, '#c39c4d')
        + line('M-4-5V5M1-6V6M6-5V5M-8 0H8', '#fff0b0', 1.9));
    case 'cabbage':
      return path('M-10 5Q-13-5-5-8Q0-12 6-7Q14-7 11 1Q9 10 0 10Z', c, '#799968')
        + line('M0 7L-1-7M0 3L-7-2M0 0L6-4M1 6L8 1', '#dfebc2', 1.8);
    case 'pepper':
      return path('M-4-6Q6-9 8-2Q6 8-8 11Q-1 6-2 0Z', c, '#a55b4b')
        + line('M-2-5Q-6-11 0-12', '#79915f', 2.2) + line('M2-3Q6 0 1 5', '#f3b38b', 2);
    case 'eggplant':
      return path('M-9-4Q0-9 10-4L7 6Q0 12-8 6Z', c, '#745d7f')
        + path('M-7-4Q0-7 8-4L5 4Q0 8-6 4Z', '#e4d7aa')
        + line('M-3-1L-2 2M2-2L3 1', '#b3a276', 1.3);
    case 'tomato':
      return ellipse(0, 0, 10, 7.5, c) + ellipse(0, -1, 7.6, 5, '#f5b693')
        + path('M0-6L2-1L8 1L2 2L0 6L-2 2L-8 0L-2-1Z', '#ffe0aa');
    case 'pineFruit': case 'oakFruit': case 'soybean':
      return [[-5, 2, -25], [3, -3, 30], [5, 5, 15]].map(([x, y, r]) => group(`translate(${x} ${y}) rotate(${r})`,
        ellipse(0, 0, 3.4, 5, c) + line('M0-2Q-2 0 0 2', '#fff0c6', 1.5))).join('');
    case 'gameMeat': case 'birdMeat': case 'crabMeat':
      return path('M-10-4L-1-9L10-3L8 6L-2 10L-10 4Z', c, '#ad7e63')
        + path('M-9-4L-1-8L9-3L0 2Z', '#f1c49b')
        + line('M-5-3L2 0M0-5L6-2M-5 4L-1 6', '#b67f60', 1.5);
    case 'sweetPotato':
      return ellipse(0, 0, 10, 7, c) + ellipse(0, -1, 7.5, 5, '#f6cc85') + line('M-4-2Q0-4 4-1', '#ffe9ba', 2);
    case 'pumpkin': case 'carrot': case 'potato':
      return path('M-9-4L2-8L10-1L6 7L-5 8L-10 2Z', c, '#c29963')
        + path('M-8-4L2-7L8-1L-2 2Z', '#ffe0a0') + line('M-3 4L3 2', '#fff0bf', 1.5);
    default: return ellipse(0, 0, 5, 3, c);
  }
}

function toppings(recipe: HiddenRecipe, y: number): string {
  return hiddenFoodGarnishes(recipe).map((kind, i) => {
    const [x, offset, scale, turn] = [[27, -1, .91, -13], [42, 5, .65, 18], [19, 7, .52, -25]][i];
    return group(`translate(${x} ${y + offset}) rotate(${turn}) scale(${scale})`, garnish(kind));
  }).join('');
}

/** 64px 黏土图标：盛器轮廓、烘烤边缘、切层及食材装饰共同区分料理。 */
export function hiddenFoodSvg(recipe: HiddenRecipe): string {
  const { shape, color, accent } = recipe.visual;
  const outline = '#947454';
  let body = '';
  if (shape === 'soup') {
    body = line('M22 15Q18 11 23 6M35 13Q31 8 36 4', '#b9bdab', 1.8)
      + path('M8 29Q10 52 31 54Q52 54 56 29Z', accent, '#778577', 1.7)
      + path('M11 36Q17 48 31 48L31 52Q16 51 11 36Z', '#596c592d')
      + ellipse(32, 29, 24, 11, '#f5e7cd') + ellipse(32, 29, 20.5, 8, color)
      + toppings(recipe, 27)
      + line('M9 30Q31 47 55 30', '#f9ecd5', 2.8)
      + line('M19 44Q24 47 28 47', '#edf0d58a', 2.4);
    if (recipe.research.includes('milk') || recipe.research.includes('cowMilk')) {
      body += line('M26 33Q33 29 41 33Q39 37 31 35', '#fff0d1', 1.8);
    }
  } else if (shape === 'cake') {
    body = ellipse(32, 51, 26, 6, '#d5dfcf')
      + path('M11 23L39 13L53 25V46L26 54L11 45Z', '#d8b479', outline)
      + path('M12 32L26 39L52 31V37L26 45L12 38Z', color)
      + path('M12 25L26 32L52 25V30L26 38L12 31Z', '#f9e5b8')
      + path('M11 23L39 13L53 25L26 34Z', accent, '#cfaf80', 1.2)
      + line('M16 25L26 30L37 26', '#fff2d9', 2.3)
      + toppings(recipe, 19);
  } else if (shape === 'pie' || shape === 'flatbread') {
    body = ellipse(32, 49, 27, 7, '#d9e1cc')
      + path('M8 30Q9 19 32 18Q54 19 56 30L53 44Q32 57 11 44Z', '#c29458', outline)
      + ellipse(32, 30, 24, 12, '#ecc98a') + ellipse(32, 29, 20, 9, color)
      + line('M12 41Q30 51 51 42', '#b2814d', 2)
      + (shape === 'pie' ? line('M16 25L41 37M26 21L49 32M16 33L35 22M25 39L46 27', accent, 3.3)
        : line('M15 37L20 39M36 41L42 39M48 30L48 33', '#a87447', 2.3))
      + toppings(recipe, 25);
  } else if (shape === 'roll') {
    body = ellipse(32, 47, 27, 10, '#cfdbce') + ellipse(32, 44, 23, 8, '#f5e8ca');
    for (const [x, y] of [[18, 28], [32, 36]]) {
      body += group(`translate(${x} ${y}) rotate(-24)`,
        path('M-7-9Q-10-7-8 6L14 10Q24 8 23-1L18-8Z', color, '#758e5c')
        + ellipse(-5, -1, 6, 8, '#d4dfb2') + ellipse(-5, -1, 3.4, 5, hiddenIngredientColor(recipe.visual.garnish))
        + line('M4-7Q0 0 5 7M12-7Q8 2 13 8', '#d3e3ad', 2));
    }
    body += group('translate(46 24) scale(.55)', leaf);
  } else if (shape === 'skewer') {
    body = ellipse(32, 51, 26, 6, '#d3ddcc');
    for (const [x, y] of [[24, 29], [39, 32]]) {
      body += group(`translate(${x} ${y}) rotate(22)`, line('M0-23V25', '#a48256', 3)
        + [-12, 0, 12].map((offset, i) => group(`translate(0 ${offset}) scale(.75)`, garnish(i === 1 ? 'pepper' : 'gameMeat'))).join(''));
    }
  } else if (shape === 'pumpkin') {
    body = ellipse(32, 50, 25, 7, '#cfdcca')
      + path('M10 28Q9 51 32 53Q55 51 54 28Z', color, '#ad7b45')
      + line('M20 32Q18 46 25 51M41 32Q45 45 38 51M31 32V50', '#efba6f', 3)
      + ellipse(32, 28, 22, 10, '#f8d393') + ellipse(32, 28, 17, 6, '#aa7545')
      + toppings(recipe, 25) + group('translate(44 15) rotate(20)', ellipse(0, 0, 11, 4, '#edb365')
        + line('M0-1L2-7', '#82935d', 3));
  } else {
    body = ellipse(32, 44, 27, 13, accent) + ellipse(32, 41, 25, 11, '#ecdfc5')
      + ellipse(32, 40, 20, 8, '#f9efdb') + ellipse(32, 38, 17, 7, color)
      + (recipe.kind === 'milkyMashedPotato' ? path('M17 35Q17 28 25 27Q23 19 33 20Q43 20 42 28Q49 31 45 37Q31 44 17 35Z', '#f7e3b5')
        + line('M26 27Q31 24 37 28M22 34Q32 29 40 34', '#d6b681', 1.7) : toppings(recipe, 29))
      + group('translate(46 36) rotate(22) scale(.6)', leaf)
      + line('M13 45Q26 54 46 48', '#fff4df', 1.8);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 64 64" aria-hidden="true">${ellipse(32, 57, 23, 3, '#49392718')}${body}</svg>`;
}

export const HIDDEN_FOOD_SVG = hiddenRecipeRecord(hiddenFoodSvg);
