import * as THREE from 'three';

export type MoveVector = { x: number; z: number };

/** 合并键盘与虚拟摇杆的移动输入(非本地玩家的实例不挂键盘监听) */
export class MoveInput {
  private keys = new Set<string>();
  private joystick: MoveVector = { x: 0, z: 0 };

  constructor(attach = true) {
    if (attach) {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
    }
  }

  private onKeyDown = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase());
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

  setJoystick(x: number, z: number): void {
    this.joystick.x = x;
    this.joystick.z = z;
  }

  getVector(out: THREE.Vector2): THREE.Vector2 {
    let x = this.joystick.x;
    let z = this.joystick.z;
    if (this.keys.has('w') || this.keys.has('arrowup')) z -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) z += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    return out.set(x, z);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
