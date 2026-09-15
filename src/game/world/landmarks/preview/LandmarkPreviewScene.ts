import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { landmarkBlueprint, type LandmarkKind } from '../LandmarkDefinitions';
import { populatePreview } from './PreviewModels';
import { disposeOwnedMeshes } from '../../../core/disposeOwnedMeshes';

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export class LandmarkPreviewScene {
  private renderer = new THREE.WebGLRenderer({ antialias: true });
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-15, 15, 15, -15, 0.1, 250);
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private sun = new THREE.DirectionalLight('#fff0d6', 3);
  private ambient = new THREE.HemisphereLight('#d7edff', '#66704b', 2);
  private frame = 0;
  private span = 15;
  private previous = 0;
  private animated: ReturnType<typeof populatePreview> = [];

  constructor(private container: HTMLElement, kind: LandmarkKind, seed: number) {
    const blueprint = landmarkBlueprint(kind, seededRandom(seed));
    this.span = kind === 'village' ? 10 : 8;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);
    this.sun.position.set(8, 22, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(512, 512);
    Object.assign(this.sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, far: 70 });
    this.sun.shadow.bias = -0.001;
    this.scene.add(this.sun, this.ambient);
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(blueprint.radius + 2, blueprint.radius + 3, 0.6, 48),
      new THREE.MeshStandardMaterial({ color: '#91a576', roughness: 1, flatShading: true }));
    ground.position.y = -0.32; ground.receiveShadow = true;
    this.scene.add(ground);
    this.animated = populatePreview(this.scene, blueprint);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.minZoom = 0.6; this.controls.maxZoom = 4;
    this.controls.minPolarAngle = 0.15; this.controls.maxPolarAngle = Math.PI / 2.2;
    this.reset(); this.setNight(false);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container); this.resize();
    this.frame = requestAnimationFrame(this.render);
  }
  private resize() {
    const width = Math.max(1, this.container.clientWidth), height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height);
    const aspect = width / height;
    this.camera.left = -this.span * Math.max(1, aspect);
    this.camera.right = -this.camera.left;
    this.camera.top = this.span / Math.min(1, aspect);
    this.camera.bottom = -this.camera.top;
    this.camera.updateProjectionMatrix();
  }
  setNight(night: boolean) {
    this.scene.background = new THREE.Color(night ? '#182638' : '#e4e9dc');
    this.ambient.intensity = night ? 0.45 : 2;
    this.sun.intensity = night ? 0.25 : 3;
  }
  zoom(factor: number) {
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * factor, 0.6, 4);
    this.camera.updateProjectionMatrix();
  }
  reset() {
    this.camera.position.set(20, 26, 30); this.camera.zoom = 1;
    this.controls.target.set(0, 0, 0); this.controls.update(); this.camera.updateProjectionMatrix();
  }
  private render = (time: number) => {
    const delta = this.previous ? Math.min((time - this.previous) / 1000, 0.05) : 0;
    this.previous = time;
    if (!document.hidden) {
      for (const shrine of this.animated) shrine.update(delta, time / 1000);
      this.renderer.render(this.scene, this.camera);
    }
    this.frame = requestAnimationFrame(this.render);
  };
  dispose() {
    cancelAnimationFrame(this.frame); this.observer.disconnect(); this.controls.dispose();
    for (const shrine of this.animated) shrine.dispose();
    this.sun.shadow.dispose(); disposeOwnedMeshes(this.scene);
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
