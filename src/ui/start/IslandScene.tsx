'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** A small, decorative world. It never creates gameplay or network state. */
export function IslandScene() {
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch {
      return; // The CSS backdrop and menu remain visible without WebGL.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-6, 6, 4.5, -4.5, 0.1, 80);
    camera.position.set(9, 10, 15);
    camera.lookAt(0, 0.6, 0);
    scene.add(new THREE.HemisphereLight('#fff1d6', '#286960', 2.8));
    const sun = new THREE.DirectionalLight('#fff2da', 3);
    sun.position.set(-5, 8, 5);
    scene.add(sun);
    const world = new THREE.Group();
    scene.add(world);
    const materials = new Map<string, THREE.MeshStandardMaterial>();
    const material = (color: string) => {
      if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
      return materials.get(color)!;
    };
    const mesh = (geometry: THREE.BufferGeometry, color: string, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
      const item = new THREE.Mesh(geometry, material(color));
      item.position.set(x, y, z);
      parent.add(item);
      return item;
    };
    const sand = mesh(new THREE.CylinderGeometry(2.75, 2.45, 0.55, 11), '#edce91', world, 0, 0.1);
    sand.scale.set(1.2, 1, 0.82);
    const grass = mesh(new THREE.CylinderGeometry(1.9, 2.3, 0.22, 9), '#849c57', world, -0.25, 0.46, -0.25);
    grass.scale.z = 0.8;
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(3.1 + i * 0.65, 3.14 + i * 0.65, 64), new THREE.MeshBasicMaterial({ color: '#c1ebce', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.scale.y = 0.8;
      ring.position.y = -0.22 - i * 0.01;
      world.add(ring);
      rings.push(ring);
    }
    const crowns: THREE.Group[] = [];
    const palm = (x: number, z: number, scale: number) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0.55, z);
      tree.scale.setScalar(scale);
      world.add(tree);
      for (let i = 0; i < 6; i++) {
        const trunk = mesh(new THREE.CylinderGeometry(0.11 - i * 0.008, 0.14 - i * 0.008, 0.4, 6), i % 2 ? '#a77849' : '#be9058', tree, i * 0.055, i * 0.36 + 0.18);
        trunk.rotation.z = -0.14;
      }
      const crown = new THREE.Group();
      crown.position.set(0.32, 2.2, 0);
      tree.add(crown);
      crowns.push(crown);
      for (let i = 0; i < 7; i++) {
        const leaf = new THREE.BufferGeometry();
        leaf.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 0.65,0.3,-0.26, 1.55,-0.32,0, 0,0,0, 1.55,-0.32,0, 0.65,0.3,0.26], 3));
        leaf.computeVertexNormals();
        const frond = mesh(leaf, i % 2 ? '#386e4b' : '#589354', crown);
        frond.material.side = THREE.DoubleSide;
        frond.rotation.y = i * Math.PI * 2 / 7;
      }
      mesh(new THREE.IcosahedronGeometry(0.18, 0), '#795139', crown, 0, -0.13, 0.1);
    };
    palm(-1.1, -0.55, 1.1);
    palm(1.3, -0.8, 0.8);
    for (let i = 0; i < 5; i++) {
      const rock = mesh(new THREE.DodecahedronGeometry(0.28 + i * 0.03, 0), '#a2a698', world, -1.9 + i * 0.24, 0.48, 0.7 + Math.sin(i) * 0.2);
      rock.scale.y = 0.7;
    }
    // A folded canvas shelter, with an open, dark triangular entrance.
    const tent = mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.15, 3, 1), '#da884b', world, 0.35, 0.9, -0.15);
    tent.rotation.set(Math.PI / 2, Math.PI / 2, 0);
    const opening = mesh(new THREE.CircleGeometry(0.56, 3), '#684937', world, 0.35, 0.82, 0.44);
    opening.rotation.z = Math.PI / 2;
    const fire = new THREE.Group();
    fire.position.set(0.7, 0.5, 1.1);
    world.add(fire);
    for (let i = 0; i < 2; i++) {
      const log = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 5), '#735039', fire);
      log.rotation.set(Math.PI / 2, 0, i * Math.PI / 2 + 0.4);
    }
    const flame = mesh(new THREE.ConeGeometry(0.19, 0.65, 5), '#ffb44e', fire, 0, 0.3);
    mesh(new THREE.ConeGeometry(0.1, 0.4, 5), '#ffe6a0', fire, 0, 0.22, 0.1);
    const boat = new THREE.Group();
    boat.position.set(3.65, -0.05, 1.6);
    boat.rotation.y = -0.4;
    world.add(boat);
    const hull = mesh(new THREE.SphereGeometry(0.55, 6, 4), '#985f3b', boat);
    hull.scale.set(0.55, 0.35, 1.5);
    mesh(new THREE.BoxGeometry(0.5, 0.08, 0.18), '#e6b777', boat, 0, 0.17);
    const paddle = mesh(new THREE.BoxGeometry(0.08, 0.06, 1.2), '#e6b777', boat, 0.3, 0.23);
    paddle.rotation.y = -0.5;
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(width, height);
      const aspect = width / Math.max(height, 1);
      const halfHeight = Math.max(3.4, 5.2 / aspect);
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let previous = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden || now - previous < 33) return;
      previous = now;
      const t = motion.matches ? 0 : now * 0.001;
      world.rotation.y = Math.sin(t * 0.12) * 0.055;
      crowns.forEach((crown, i) => { crown.rotation.z = Math.sin(t * 1.2 + i) * 0.035; });
      rings.forEach((ring, i) => {
        const pulse = (t * 0.16 + i / 3) % 1;
        ring.scale.set(1 + pulse * 0.15, 0.8 + pulse * 0.12, 1);
        (ring.material as THREE.MeshBasicMaterial).opacity = (1 - pulse) * 0.35;
      });
      boat.position.y = -0.05 + Math.sin(t * 1.6) * 0.07;
      boat.rotation.z = Math.sin(t * 1.3) * 0.06;
      flame.scale.set(1 + Math.sin(t * 7) * 0.1, 1 + Math.sin(t * 9) * 0.15, 1);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (!Array.isArray(object.material)) object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return <div ref={mount} className="island-scene" aria-hidden="true" />;
}
