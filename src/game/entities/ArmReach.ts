import * as THREE from 'three';

/** 两段手臂解析求解：在肩部父坐标系中指定掌心，肘部向身体外侧弯曲。 */
export class ArmReach {
  private direction = new THREE.Vector3();
  private bend = new THREE.Vector3();
  private joint = new THREE.Vector3();
  private upper = new THREE.Vector3();
  private lower = new THREE.Vector3();
  private inverse = new THREE.Quaternion();
  private restUpper: THREE.Vector3;
  private restLower: THREE.Vector3;
  private upperLength: number;
  private lowerLength: number;

  constructor(private shoulder: THREE.Group, private elbow: THREE.Group, private side: number) {
    this.restUpper = elbow.position.clone();
    this.restLower = new THREE.Vector3(side * 0.006, -0.155, 0.012);
    this.upperLength = this.restUpper.length();
    this.lowerLength = this.restLower.length();
    this.restUpper.normalize();
    this.restLower.normalize();
  }

  solve(target: THREE.Vector3, weight: number): void {
    this.direction.subVectors(target, this.shoulder.position);
    const distance = THREE.MathUtils.clamp(this.direction.length(), 0.025,
      this.upperLength + this.lowerLength - 0.001);
    this.direction.normalize();
    this.bend.set(this.side, -0.3, -0.15);
    this.bend.addScaledVector(this.direction, -this.bend.dot(this.direction)).normalize();
    const along = (this.upperLength ** 2 - this.lowerLength ** 2 + distance ** 2) / (2 * distance);
    const outward = Math.sqrt(Math.max(0, this.upperLength ** 2 - along ** 2));
    this.joint.copy(this.direction).multiplyScalar(along).addScaledVector(this.bend, outward);
    this.upper.copy(this.joint).normalize();
    this.inverse.setFromUnitVectors(this.restUpper, this.upper);
    this.shoulder.quaternion.slerp(this.inverse, weight);
    this.inverse.copy(this.shoulder.quaternion).invert();
    this.lower.copy(this.direction).multiplyScalar(distance).sub(this.joint).normalize().applyQuaternion(this.inverse);
    this.inverse.setFromUnitVectors(this.restLower, this.lower);
    this.elbow.quaternion.slerp(this.inverse, weight);
  }
}
