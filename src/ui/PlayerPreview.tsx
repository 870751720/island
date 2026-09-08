'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createPlayerModel, type PlayerGender } from '@/game/entities/PlayerModel';

/** 性别设置弹窗里的黏土小人预览:小画布内自转展示当前性别的模型。 */
export function PlayerPreview({ gender }: { gender: PlayerGender }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<ReturnType<typeof createPlayerModel> | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 10);
    camera.position.set(0, 1.05, 3.2);
    camera.lookAt(0, 0.82, 0);
    scene.add(new THREE.HemisphereLight('#cfe8ff', '#8a7a5a', 1.1));
    const sun = new THREE.DirectionalLight('#fff3d6', 1.6);
    sun.position.set(2, 3, 2);
    scene.add(sun);

    const model = createPlayerModel();
    modelRef.current = model;
    scene.add(model.root);

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let raf = 0;
    const tick = (now: number) => {
      // 静态正面展示,仅轻微上下浮动表现"活"的质感
      model.root.position.y = Math.sin(now / 700) * 0.02;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      model.root.traverse((node) => {
        const mesh = node as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
        mesh.geometry?.dispose?.();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose?.();
      });
      renderer.dispose();
      renderer.domElement.remove();
      modelRef.current = null;
    };
  }, []);

  useEffect(() => {
    modelRef.current?.setGender(gender);
  }, [gender]);

  return <div ref={hostRef} className="profile-preview-canvas" />;
}
