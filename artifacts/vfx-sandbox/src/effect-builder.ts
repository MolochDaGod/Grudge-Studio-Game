import * as THREE from 'three';
import type { EffectPreset } from './types';
import { BUILTIN_SHADERS } from './shaders';

export interface EffectSceneHandles {
  objects: THREE.Object3D[];
  materials: THREE.ShaderMaterial[];
  particles: THREE.Points[];
}

export interface EffectBuildOptions {
  intensity?: number;
  particleScale?: number;
  shaders?: Record<string, { vertex: string; fragment: string }>;
}

function shaderFor(preset: EffectPreset, opts: EffectBuildOptions) {
  const key = preset.shader ?? preset.category;
  return opts.shaders?.[key] ?? BUILTIN_SHADERS[key] ?? BUILTIN_SHADERS.magic;
}

function makeParticles(
  scene: THREE.Scene,
  handles: EffectSceneHandles,
  color: string,
  count: number,
  size: number,
  updater?: (time: number, positions: Float32Array) => void,
) {
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 1.5;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.random() * 2;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: new THREE.Color(color),
    size,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(particleGeometry, material);
  if (updater) {
    points.userData.update = (time: number) => updater(time, positions);
  } else {
    points.userData.update = (time: number) => {
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] = ((time * 0.5 + i * 0.01) % 1) * 2;
      }
      particleGeometry.attributes.position.needsUpdate = true;
    };
  }
  scene.add(points);
  handles.objects.push(points);
  handles.particles.push(points);
}

export function clearEffectScene(scene: THREE.Scene, handles: EffectSceneHandles) {
  for (const obj of handles.objects) scene.remove(obj);
  for (const p of handles.particles) scene.remove(p);
  handles.objects.length = 0;
  handles.materials.length = 0;
  handles.particles.length = 0;
}

export function buildEffectInScene(
  scene: THREE.Scene,
  preset: EffectPreset,
  opts: EffectBuildOptions = {},
): EffectSceneHandles {
  const handles: EffectSceneHandles = { objects: [], materials: [], particles: [] };
  const intensity = opts.intensity ?? preset.intensity;
  const particleSize = (opts.particleScale ?? 1) * 0.1;
  const c1 = new THREE.Color(preset.primaryColor);
  const c2 = new THREE.Color(preset.secondaryColor);
  const shaders = shaderFor(preset, opts);

  const addShaderMesh = (
    geometry: THREE.BufferGeometry,
    extraUniforms: Record<string, THREE.IUniform> = {},
    layout?: (mesh: THREE.Mesh, i: number) => void,
    count = 1,
  ) => {
    for (let i = 0; i < count; i++) {
      const material = new THREE.ShaderMaterial({
        vertexShader: shaders.vertex,
        fragmentShader: shaders.fragment,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uColor1: { value: c1.clone() },
          uColor2: { value: c2.clone() },
          uIntensity: { value: intensity },
          ...extraUniforms,
        },
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      handles.materials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      layout?.(mesh, i);
      scene.add(mesh);
      handles.objects.push(mesh);
    }
  };

  switch (preset.category) {
    case 'fire':
    case 'combat':
    case 'annihilator':
      addShaderMesh(new THREE.PlaneGeometry(2, 3, 32, 32), {}, (mesh, i) => {
        const angle = (i / 6) * Math.PI * 2;
        mesh.position.set(Math.cos(angle) * 0.5, 1.5, Math.sin(angle) * 0.5);
        mesh.rotation.y = -angle + Math.PI / 2;
      }, 6);
      makeParticles(scene, handles, preset.primaryColor, Math.floor(preset.particleCount * intensity), particleSize);
      break;

    case 'ice':
    case 'environment':
      addShaderMesh(new THREE.RingGeometry(0.5, 2, 64), {}, mesh => {
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.1;
      });
      for (let i = 0; i < 8; i++) {
        const crystal = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, 0.8 + Math.random(), 4),
          new THREE.MeshStandardMaterial({
            color: c1,
            emissive: c2,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.8,
            metalness: 0.9,
            roughness: 0.1,
          }),
        );
        const angle = (i / 8) * Math.PI * 2;
        crystal.position.set(Math.cos(angle) * 1.2, 0.4, Math.sin(angle) * 1.2);
        scene.add(crystal);
        handles.objects.push(crystal);
      }
      makeParticles(scene, handles, preset.secondaryColor, Math.floor(preset.particleCount * 0.6), particleSize * 0.8);
      break;

    case 'lightning':
      addShaderMesh(new THREE.PlaneGeometry(0.5, 6, 8, 32), {}, mesh => {
        mesh.position.y = 3;
      });
      addShaderMesh(new THREE.PlaneGeometry(0.3, 2, 4, 16), {}, mesh => {
        mesh.position.set((Math.random() - 0.5), 2.5, (Math.random() - 0.5) * 0.5);
        mesh.rotation.z = (Math.random() - 0.5) * 0.8;
      }, 3);
      {
        const light = new THREE.PointLight(c1, 5 * intensity, 12);
        light.position.y = 2;
        scene.add(light);
        handles.objects.push(light);
      }
      break;

    case 'magic':
    case 'portal':
      addShaderMesh(new THREE.RingGeometry(1.2, 1.8, 64), {}, mesh => {
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.15;
      });
      for (let i = 0; i < 3; i++) {
        const rune = new THREE.Mesh(
          new THREE.TorusGeometry(1 - i * 0.15, 0.04, 8, 6),
          new THREE.MeshBasicMaterial({ color: c1, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }),
        );
        rune.position.y = 0.6 + i * 0.7;
        rune.rotation.x = Math.PI / 2;
        scene.add(rune);
        handles.objects.push(rune);
      }
      makeParticles(scene, handles, preset.primaryColor, Math.floor(preset.particleCount * intensity), particleSize * 0.6);
      break;

    case 'impact':
      addShaderMesh(new THREE.RingGeometry(1, 3.5, 64), {}, mesh => {
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.08;
      });
      addShaderMesh(new THREE.PlaneGeometry(2.5, 3.5, 16, 16), {}, (mesh, i) => {
        const angle = (i / 6) * Math.PI * 2;
        mesh.position.set(Math.cos(angle) * 0.7, 1.8, Math.sin(angle) * 0.7);
        mesh.rotation.y = -angle;
      }, 6);
      makeParticles(scene, handles, preset.primaryColor, Math.floor(preset.particleCount * intensity), particleSize * 1.2);
      break;

    case 'aura':
    default: {
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 24, 24),
        new THREE.MeshBasicMaterial({
          color: c1,
          transparent: true,
          opacity: 0.18,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
        }),
      );
      shell.position.y = 1.5;
      scene.add(shell);
      handles.objects.push(shell);
      makeParticles(scene, handles, preset.primaryColor, Math.floor(preset.particleCount * 0.5), particleSize * 0.5, time => {
        // spiral orbit
      });
      const light = new THREE.PointLight(c1, 2 * intensity, 8);
      light.position.y = 1.5;
      scene.add(light);
      handles.objects.push(light);
      break;
    }
  }

  return handles;
}