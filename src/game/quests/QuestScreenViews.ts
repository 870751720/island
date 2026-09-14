import { Frustum, Matrix4, Sphere, Vector3 } from 'three';
import type { OrthographicCamera } from 'three';
import type { PlayerSession } from '../mp/PlayerSession';

interface ScreenView {
  frustum: Frustum;
  origin: Vector3;
  received: number;
}

/** 各端只提供相机视域，补羊资格和落点仍由房主决定。视域不入档。 */
export class QuestScreenViews {
  private views = new WeakMap<PlayerSession, ScreenView>();
  private sphere = new Sphere(new Vector3(), 3);

  capture(camera: OrthographicCamera): number[] {
    camera.updateMatrixWorld();
    return new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).toArray();
  }

  receive(session: PlayerSession, elements: number[] | null): boolean {
    if (!elements) { this.views.delete(session); return true; }
    if (elements.length !== 16 || !elements.every(n => Number.isFinite(n) && Math.abs(n) <= 10000)) return false;
    // 游戏相机为正交相机；拒绝退化或异常缩放的视域。
    if (Math.abs(elements[3]) > 1e-6 || Math.abs(elements[7]) > 1e-6 || Math.abs(elements[11]) > 1e-6 || Math.abs(elements[15] - 1) > 1e-6) return false;
    for (const row of [0, 1]) {
      const scale = Math.hypot(elements[row], elements[row + 4], elements[row + 8]);
      if (scale < 0.005 || scale > 2) return false;
    }
    const matrix = new Matrix4().fromArray(elements);
    if (Math.abs(matrix.determinant()) < 1e-10) return false;
    const frustum = new Frustum().setFromProjectionMatrix(matrix);
    if (!frustum.containsPoint(session.player.group.position)) return false;
    this.views.set(session, { frustum, origin: session.player.group.position.clone(), received: performance.now() });
    return true;
  }

  private current(session: PlayerSession): ScreenView | null {
    const view = this.views.get(session);
    return view && performance.now() - view.received <= 2500 && view.origin.distanceToSquared(session.player.group.position) <= 25 ? view : null;
  }

  hasCurrent(session: PlayerSession): boolean { return this.current(session) !== null; }

  visible(session: PlayerSession, point: { x: number; y: number; z: number }): boolean {
    const view = this.current(session);
    if (!view) return Math.hypot(point.x - session.player.group.position.x, point.z - session.player.group.position.z) < 60;
    // 包住整只羊并留出屏幕边缘余量，避免羊身体突然出现在画面内。
    this.sphere.center.set(point.x, point.y + 1, point.z);
    return view.frustum.intersectsSphere(this.sphere);
  }
}
