'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { createAMCMark, type AMCMarkInstance } from './amc-mark-anim.js';
import { useTheme } from 'next-themes';

export interface ScrollTimelineState {
  progress: number;
  velocity: number;
  isScrolling: boolean;
  chapter: number;
}

export interface AmcMarkSceneProps {
  onReady: () => void;
  onError: () => void;
  progress?: number;
  velocity?: number;
  isScrolling?: boolean;
  scrollStateRef?: MutableRefObject<ScrollTimelineState>;
  dir?: 'ltr' | 'rtl';
}

export function AmcMarkScene({
  progress = 0,
  velocity = 0,
  isScrolling = false,
  scrollStateRef,
  dir = 'ltr',
  onReady,
  onError,
}: AmcMarkSceneProps) {
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);
  const markRef = useRef<AMCMarkInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const fallbackPropsRef = useRef({ progress, velocity, isScrolling });

  useEffect(() => {
    themeRef.current = resolvedTheme;
    markRef.current?.setColors(resolvedTheme === 'dark' ? '#FBF1E6' : '#0B1F44', '#F7761E');
    wakeRef.current?.();
  }, [resolvedTheme]);

  useEffect(() => {
    fallbackPropsRef.current = { progress, velocity, isScrolling };
    wakeRef.current?.();
  }, [progress, velocity, isScrolling]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    const markBounds = new THREE.Box3();
    const projectedCorner = new THREE.Vector3();
    const viewTarget = new THREE.Vector3();
    const viewOffset = new THREE.Vector3();

    // The supplied model uses SVG units (~568 wide), with camera distances >= 640.
    const camera = new THREE.PerspectiveCamera(36, width / height, 1, 10000);
    camera.position.set(0, 0, 10);

    // WebGLRenderer with ACESFilmicToneMapping per amc-logo-scroll.html
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'default',
      });
    } catch {
      onError();
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    // Studio Lighting Rig from docs/assets/amc-mark-3d-package/amc-logo-scroll.html
    const hemiLight = new THREE.HemisphereLight(0xfff4e4, 0x050e22, 1.2);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff6ea, 2.8);
    keyLight.position.set(2.6, 3.4, 4.0);
    scene.add(keyLight);

    const rimB = new THREE.DirectionalLight(0x5d8fff, 1.2);
    rimB.position.set(-3.4, -1.8, -2.2);
    scene.add(rimB);

    const rimO = new THREE.DirectionalLight(0xff7a1f, 1.4);
    rimO.position.set(2.8, -1.2, 2.2);
    scene.add(rimO);

    // 5-piece 3D AMC Mark
    let mark: ReturnType<typeof createAMCMark>;
    try {
      mark = createAMCMark({ finish: 'glossy', colors: { navy: themeRef.current === 'dark' ? '#FBF1E6' : '#0B1F44', orange: '#F7761E' } });
      markRef.current = mark;
    } catch {
      renderer.dispose();
      renderer.domElement.remove();
      onError();
      return;
    }
    scene.add(mark.root);

    let animationFrameId = 0;
    let ready = false;
    let stopped = false;
    const contextLost = (event: Event) => {
      event.preventDefault();
      stopped = true;
      cancelAnimationFrame(animationFrameId);
      onError();
    };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);

    let cur = scrollStateRef ? scrollStateRef.current.progress : fallbackPropsRef.current.progress;
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;
    const t0 = performance.now();
    let prev = t0;
    let clock = 0;
    let autoSeconds = 0;
    let autoWeight = 0;
    let scrollOwnsMotion = window.scrollY > 8;
    const handleScroll = () => { if (window.scrollY > 8) scrollOwnsMotion = true; };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handlePointerMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      wakeRef.current?.();
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      wakeRef.current?.();
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Render only while the intro or scroll/pointer damping is settling.
    const render = (now: number) => {
      animationFrameId = 0;
      if (stopped || document.hidden) return;
      const dt = Math.min(0.2, (now - prev) / 1000);
      prev = now;
      clock += Math.min(0.05, dt); // Hidden tabs pause the choreography instead of skipping poses.
      const elapsed = clock;
      const intro = Math.min(1, elapsed / 1.4);

      const rawTarget = scrollStateRef
        ? scrollStateRef.current.progress
        : fallbackPropsRef.current.progress;
      const scrollVal = Math.max(0, Math.min(1, rawTarget));
      if (scrollVal > 0.001) scrollOwnsMotion = true;
      // Autoplay belongs only to the opening visit. Scrolling takes ownership
      // even when the reader stops, including when returning to the hero.
      if (!scrollOwnsMotion && elapsed > 1.6) autoSeconds = (autoSeconds + dt) % 11.6;
      const autoTarget = !scrollOwnsMotion && elapsed > 1.6 ? 1 : 0;
      autoWeight += (autoTarget - autoWeight) * (1 - Math.exp(-dt * 9));
      const target = scrollVal;

      cur += (target - cur) * (1 - Math.pow(0.0015, dt));
      px += (tx - px) * (1 - Math.pow(0.001, dt));
      py += (ty - py) * (1 - Math.pow(0.001, dt));

      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const aspect = w / Math.max(1, h);

      mark.update(cur, intro, elapsed, autoSeconds, autoWeight);
      const cam = mark.camera(cur, intro, aspect, camera.fov);
      const isRtl = dir === 'rtl';

      const idleOrbitYaw = Math.sin(elapsed * 0.55) * 0.06 * autoWeight;
      const idleOrbitPitch = Math.cos(elapsed * 0.42) * 0.03 * autoWeight;
      const yaw = (isRtl ? -cam.yaw : cam.yaw) + px * 0.14 + idleOrbitYaw;
      const pitch = cam.pitch + -py * 0.1 + idleOrbitPitch;
      // The artwork is not mirrored: the C focus remains on its actual position.
      const targetX = cam.tx;

      camera.position.set(
        targetX + Math.sin(yaw) * Math.cos(pitch) * cam.dist * 1.06,
        cam.ty + Math.sin(pitch) * cam.dist * 1.06,
        Math.cos(yaw) * Math.cos(pitch) * cam.dist * 1.06,
      );
      camera.lookAt(targetX, cam.ty, 0);

      // Keep the complete animated geometry inside the canvas during chapter
      // transitions, including expanded pieces and the focused C poses.
      mark.root.updateMatrixWorld(true);
      markBounds.setFromObject(mark.root);
      viewTarget.set(targetX, cam.ty, 0);
      viewOffset.copy(camera.position).sub(viewTarget);
      for (let attempt = 0; attempt < 12; attempt += 1) {
        camera.updateMatrixWorld(true);
        let fits = true;
        for (let corner = 0; corner < 8; corner += 1) {
          projectedCorner.set(
            corner & 1 ? markBounds.max.x : markBounds.min.x,
            corner & 2 ? markBounds.max.y : markBounds.min.y,
            corner & 4 ? markBounds.max.z : markBounds.min.z,
          ).project(camera);
          if (Math.abs(projectedCorner.x) > 0.94 || Math.abs(projectedCorner.y) > 0.94 || projectedCorner.z > 1) fits = false;
        }
        if (fits) break;
        viewOffset.multiplyScalar(1.12);
        camera.position.copy(viewTarget).add(viewOffset);
        camera.lookAt(viewTarget);
      }
      rimO.intensity = 1.4 + Math.sin(elapsed * 1.8) * 0.35;

      if (!document.hidden) {
        try { renderer.render(scene, camera); }
        catch { stopped = true; onError(); return; }
        if (!ready && intro === 1) { ready = true; onReady(); }
      }
      const settling = Math.abs(target - cur) > 0.0001 || Math.abs(tx - px) + Math.abs(ty - py) > 0.0001 || autoWeight > 0.001;
      const active = intro < 1 || !scrollOwnsMotion || settling;
      renderer.domElement.dataset.renderState = active ? 'active' : 'settled';
      if (!stopped && !document.hidden && active) animationFrameId = requestAnimationFrame(render);
    };

    const wake = () => {
      if (!animationFrameId && !stopped && !document.hidden) {
        prev = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };
    wakeRef.current = wake;
    window.addEventListener('scroll', wake, { passive: true });
    document.addEventListener('visibilitychange', wake);
    wake();

    // SPA Unmount VRAM Disposal Contract
    return () => {
      stopped = true;
      wakeRef.current = null;
      markRef.current = null;
      document.removeEventListener('visibilitychange', wake);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', wake);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });

      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [dir, scrollStateRef, onReady, onError]);

  return <div ref={containerRef} className="amc-mark-canvas" aria-hidden="true" />;
}
