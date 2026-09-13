import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { bottleFragmentShader, bottleVertexShader } from './bottleShader';

export type BottleLevels = readonly [number, number, number];

/** 108×48 CSS 像素、一个 draw call；后台暂停，减少动态效果时按需绘制。 */
export function BottleCanvas({ levels }: { levels: BottleLevels }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(levels);
  const drawRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    targetRef.current = levels;
    drawRef.current?.();
  }, [levels[0], levels[1], levels[2]]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(108, 48, false);
    renderer.setClearColor(0, 0);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const values = new THREE.Vector3(...targetRef.current);
    const uniforms = { uLevels: { value: values }, uTime: { value: 0 }, uMotion: { value: motion.matches ? 0 : 1 } };
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({ vertexShader: bottleVertexShader, fragmentShader: bottleFragmentShader, uniforms, transparent: true, depthTest: false, depthWrite: false });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.Camera();
    let frame = 0;
    let previous = 0;
    let lost = false;
    const render = (now: number) => {
      if (lost || document.hidden) return;
      const delta = previous ? Math.min((now - previous) / 1000, 0.1) : 0;
      previous = now;
      const blend = motion.matches ? 1 : 1 - Math.exp(-delta * 9);
      const target = targetRef.current;
      values.x += (target[0] - values.x) * blend;
      values.y += (target[1] - values.y) * blend;
      values.z += (target[2] - values.z) * blend;
      uniforms.uTime.value += delta;
      uniforms.uMotion.value = motion.matches ? 0 : 1;
      renderer.render(scene, camera);
    };
    const loop = (now: number) => {
      if (now - previous >= 1000 / 30) render(now);
      frame = requestAnimationFrame(loop);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (document.hidden || lost) return;
      render(performance.now());
      if (!motion.matches) frame = requestAnimationFrame(loop);
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(frame);
      setReady(false);
    };
    const onRestored = () => { lost = false; setReady(true); resume(); };
    drawRef.current = () => { if (motion.matches) render(performance.now()); };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    document.addEventListener('visibilitychange', resume);
    motion.addEventListener('change', resume);
    setReady(true);
    resume();
    return () => {
      drawRef.current = null;
      cancelAnimationFrame(frame);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      document.removeEventListener('visibilitychange', resume);
      motion.removeEventListener('change', resume);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);
  return <canvas ref={canvasRef} className={`hud-bottle-canvas${ready ? ' is-ready' : ''}`} aria-hidden="true" />;
}
