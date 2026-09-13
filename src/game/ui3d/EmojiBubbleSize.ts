import type { OrthographicCamera } from 'three';
export const EMOJI_BUBBLE_ASPECT = 1.25;
export const EMOJI_CONTENT_RATIO = 0.59375;
export function emojiBubbleHeight(viewHeight: number, camera: OrthographicCamera): number {
 return 1.188 * viewHeight * camera.zoom / (camera.top - camera.bottom);
}
