'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildMenuIsland } from './buildMenuIsland';

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
    const animateIsland = buildMenuIsland(world);
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
      animateIsland(t);
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
