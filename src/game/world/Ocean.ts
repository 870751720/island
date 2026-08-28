import * as THREE from 'three';

export class Ocean {
  readonly mesh: THREE.Mesh;

  constructor(size = 400) {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshStandardMaterial({
        color: '#4aa3c7',
        roughness: 0.35,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
      })
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = -0.35;
  }
}
