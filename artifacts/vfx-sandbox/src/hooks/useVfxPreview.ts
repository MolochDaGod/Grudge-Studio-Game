import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  buildEffectInScene,
  clearEffectScene,
  type EffectSceneHandles,
} from '../effect-builder';
import type { EffectPreset } from '../types';

export interface VfxPreviewSettings {
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  intensity: number;
  autoRotate: boolean;
  showGrid: boolean;
}

const DEFAULT_SETTINGS: VfxPreviewSettings = {
  bloomStrength: 1.5,
  bloomRadius: 0.4,
  bloomThreshold: 0.2,
  intensity: 1,
  autoRotate: true,
  showGrid: true,
};

export function useVfxPreview(
  containerRef: React.RefObject<HTMLDivElement | null>,
  settings: Partial<VfxPreviewSettings> = {},
) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const handlesRef = useRef<EffectSceneHandles>({ objects: [], materials: [], particles: [] });
  const clockRef = useRef(new THREE.Clock());
  const animRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      const test = document.createElement('canvas');
      if (!test.getContext('webgl') && !test.getContext('experimental-webgl')) {
        setWebglOk(false);
        return;
      }
    } catch {
      setWebglOk(false);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(5, 4, 8);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      merged.bloomStrength,
      merged.bloomRadius,
      merged.bloomThreshold,
    );
    composer.addPass(bloom);
    composerRef.current = composer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 0);
    controls.autoRotate = merged.autoRotate;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0x222233, 0.5));
    const dir = new THREE.DirectionalLight(0x8888ff, 0.3);
    dir.position.set(5, 10, 5);
    scene.add(dir);

    const grid = new THREE.GridHelper(20, 40, 0x333355, 0x222244);
    grid.name = 'vfx-grid';
    grid.visible = merged.showGrid;
    scene.add(grid);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.9, metalness: 0.1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    const tick = () => {
      animRef.current = requestAnimationFrame(tick);
      const t = clockRef.current.getElapsedTime();
      for (const mat of handlesRef.current.materials) {
        if (mat.uniforms.uTime) mat.uniforms.uTime.value = t;
        if (mat.uniforms.uProgress) mat.uniforms.uProgress.value = (t % 2) / 2;
      }
      for (const p of handlesRef.current.particles) {
        p.userData.update?.(t);
      }
      controls.update();
      composer.render();
    };
    tick();
    setReady(true);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animRef.current);
      clearEffectScene(scene, handlesRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      sceneRef.current = null;
      rendererRef.current = null;
      composerRef.current = null;
      controlsRef.current = null;
      setReady(false);
    };
  }, [containerRef]);

  useEffect(() => {
    const bloom = composerRef.current?.passes[1] as UnrealBloomPass | undefined;
    if (bloom) {
      bloom.strength = merged.bloomStrength;
      bloom.radius = merged.bloomRadius;
      bloom.threshold = merged.bloomThreshold;
    }
  }, [merged.bloomStrength, merged.bloomRadius, merged.bloomThreshold]);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = merged.autoRotate;
  }, [merged.autoRotate]);

  useEffect(() => {
    const grid = sceneRef.current?.getObjectByName('vfx-grid');
    if (grid) grid.visible = merged.showGrid;
  }, [merged.showGrid]);

  const playPreset = useCallback((preset: EffectPreset, shaders?: Record<string, { vertex: string; fragment: string }>) => {
    const scene = sceneRef.current;
    if (!scene) return;
    clearEffectScene(scene, handlesRef.current);
    handlesRef.current = buildEffectInScene(scene, preset, {
      intensity: merged.intensity * preset.intensity,
      shaders,
    });
  }, [merged.intensity]);

  const clear = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    clearEffectScene(scene, handlesRef.current);
  }, []);

  return { ready, webglOk, playPreset, clear };
}