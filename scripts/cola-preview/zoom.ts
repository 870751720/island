import type { OrthographicCamera } from 'three';

/** Shared camera zoom keeps all candidates and reference models at the same viewing scale. */
export function mountZoom(stage: HTMLElement, camera: OrthographicCamera): void {
  const controls = document.createElement('div');
  controls.className = 'zoom-controls';
  controls.innerHTML = `<label for="model-zoom">预览缩放 <output id="zoom-value" for="model-zoom">100%</output></label>
    <input id="model-zoom" type="range" min="10" max="150" step="1" value="100" aria-label="模型预览缩放百分比">
    <div class="controls">${[15,25,50,100].map(value => `<button data-zoom="${value}" aria-pressed="${value === 100}">${value}%${value === 100 ? ' · 原尺寸' : ''}</button>`).join('')}</div>
    <p class="hint">缩小看整体轮廓，切换模型可在同一比例下对比。此比例仅用于预览。</p>`;
  stage.after(controls);
  const slider = controls.querySelector<HTMLInputElement>('input')!;
  const output = controls.querySelector<HTMLOutputElement>('output')!;
  function setZoom(value: number): void {
    if (!Number.isFinite(value)) return;
    const percent = Math.min(150, Math.max(10, Math.round(value)));
    camera.zoom = percent / 100;
    camera.updateProjectionMatrix();
    slider.value = String(percent);
    output.value = `${percent}%`;
    slider.setAttribute('aria-valuetext', `${percent}%`);
    controls.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.zoom) === percent));
    });
  }
  slider.addEventListener('input', () => setZoom(Number(slider.value)));
  controls.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(button => {
    button.addEventListener('click', () => setZoom(Number(button.dataset.zoom)));
  });
  setZoom(100);
}
