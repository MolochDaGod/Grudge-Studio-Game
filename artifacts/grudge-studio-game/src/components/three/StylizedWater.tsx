/**
 * StylizedWater — animated "toon / stylized" ocean shader.
 *
 * Vertex stage: two sinusoidal wave octaves displace Y for gentle swell.
 * Fragment stage: fresnel rim (viewing-angle foam) + animated noise caustics
 *                 blended between a deep ocean colour and a shallow reef hue.
 *
 * Designed to replace the flat OceanPlane around the tactical battlefield.
 * Pure ShaderMaterial, no external textures — tileable, instant to load.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWaveAmp;
  uniform float uWaveFreq;

  varying vec3  vWorldPos;
  varying vec3  vNormal;
  varying float vWaveHeight;

  void main() {
    // Two-octave sine-wave swell in object space.
    vec3 p = position;
    float wave1 = sin(p.x * uWaveFreq       + uTime * 1.2) *
                  cos(p.y * uWaveFreq * 0.8 + uTime * 0.9);
    float wave2 = sin(p.x * uWaveFreq * 2.3 - uTime * 1.7) *
                  cos(p.y * uWaveFreq * 2.1 + uTime * 1.4) * 0.5;
    float h = (wave1 + wave2) * uWaveAmp;
    p.z += h;                           // we're on a rotated plane so z is height

    vWaveHeight = h / (uWaveAmp + 0.0001);

    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorldPos = world.xyz;
    vNormal   = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3  uColorDeep;
  uniform vec3  uColorShallow;
  uniform vec3  uFoamColor;
  uniform vec3  uCameraPos;
  uniform float uFresnelPower;

  varying vec3  vWorldPos;
  varying vec3  vNormal;
  varying float vWaveHeight;

  // Tileable hash-based noise for caustics / surface shimmer.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    // Animated caustic highlights
    vec2 uv = vWorldPos.xz * 0.02;
    float caustic =
      noise(uv * 3.0 + uTime * 0.15) *
      noise(uv * 7.0 - uTime * 0.22);
    caustic = smoothstep(0.35, 0.7, caustic);

    // Fresnel: stronger at grazing angles => rim foam.
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), uFresnelPower);

    // Wave-crest foam: highlight where vertex displacement is highest.
    float crestFoam = smoothstep(0.55, 1.0, vWaveHeight);

    // Base water colour: deep → shallow by caustic mask.
    vec3 water = mix(uColorDeep, uColorShallow, caustic * 0.6);

    // Overlay foam.
    vec3 col = mix(water, uFoamColor, fresnel * 0.6 + crestFoam * 0.7);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export interface StylizedWaterProps {
  /** World position of the plane centre (x,y,z). */
  position: [number, number, number];
  /** Side length of the square plane in world units (default 3000). */
  size?: number;
  /** Segments per side — more = smoother waves, more verts. Default 80. */
  segments?: number;
  /** Max vertical wave amplitude (world units). */
  waveAmp?: number;
  /** Spatial wave frequency. Higher = shorter wavelengths. */
  waveFreq?: number;
  /** Deep ocean colour (CSS hex). */
  colorDeep?: string;
  /** Shallow / shore colour (CSS hex). */
  colorShallow?: string;
  /** Foam + fresnel rim colour (CSS hex). */
  colorFoam?: string;
  /** Fresnel falloff exponent. Higher = thinner rim. Default 3.5. */
  fresnelPower?: number;
}

export function StylizedWater({
  position,
  size = 3000,
  segments = 80,
  waveAmp = 0.08,
  waveFreq = 0.22,
  colorDeep = '#063554',
  colorShallow = '#1e8ab8',
  colorFoam = '#e6f6ff',
  fresnelPower = 3.5,
}: StylizedWaterProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(
    () => ({
      uTime:         { value: 0 },
      uWaveAmp:      { value: waveAmp },
      uWaveFreq:     { value: waveFreq },
      uColorDeep:    { value: new THREE.Color(colorDeep).convertSRGBToLinear() },
      uColorShallow: { value: new THREE.Color(colorShallow).convertSRGBToLinear() },
      uFoamColor:    { value: new THREE.Color(colorFoam).convertSRGBToLinear() },
      uCameraPos:    { value: new THREE.Vector3() },
      uFresnelPower: { value: fresnelPower },
    }),
    // deliberately once — we could re-set in useEffect if props change
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useFrame(({ clock, camera }) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uTime.value = clock.getElapsedTime();
    u.uCameraPos.value.copy(camera.position);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={[size, size, segments, segments]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
