export const FIRE_VERTEX = `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.y += sin(uTime * 3.0 + position.x * 5.0) * 0.1;
    pos.x += cos(uTime * 2.0 + position.y * 4.0) * 0.05;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const FIRE_FRAGMENT = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uIntensity;
  float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 uv = vUv; uv.y -= uTime * 0.5;
    float n = fbm(uv * 4.0 + uTime);
    float flame = pow(1.0 - vUv.y, 1.5) * n;
    flame *= smoothstep(0.0, 0.3, vUv.y);
    flame *= smoothstep(1.0, 0.7, abs(vUv.x - 0.5) * 2.0);
    vec3 color = mix(uColor2, uColor1, flame);
    gl_FragColor = vec4(color, flame * uIntensity * 2.0);
  }
`;

export const LIGHTNING_VERTEX = `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin(uTime * 20.0 + position.y * 10.0) * 0.1;
    pos.x += wave * (1.0 - vUv.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const LIGHTNING_FRAGMENT = `
  varying vec2 vUv;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uTime;
  void main() {
    float glow = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 0.5);
    glow *= 1.0 - vUv.y * 0.3;
    glow *= 0.8 + 0.2 * sin(uTime * 50.0);
    vec3 color = mix(uColor2, uColor1, glow);
    gl_FragColor = vec4(color, glow * 1.5);
  }
`;

export const SHOCKWAVE_VERTEX = `
  varying vec2 vUv;
  uniform float uProgress;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float scale = 1.0 + uProgress * 3.0;
    pos.xz *= scale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const SHOCKWAVE_FRAGMENT = `
  varying vec2 vUv;
  uniform vec3 uColor1;
  uniform float uProgress;
  void main() {
    float dist = distance(vUv, vec2(0.5));
    float ring = smoothstep(0.4, 0.5, dist) * smoothstep(0.6, 0.5, dist);
    gl_FragColor = vec4(uColor1, ring * (1.0 - uProgress));
  }
`;

export const MAGIC_VERTEX = `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.y += sin(uTime * 2.0 + atan(position.x, position.z) * 3.0) * 0.1;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const MAGIC_FRAGMENT = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  void main() {
    float pulse = 0.5 + 0.5 * sin(uTime * 3.0 + length(vUv - 0.5) * 10.0);
    float ring = smoothstep(0.35, 0.5, length(vUv - 0.5));
    vec3 color = mix(uColor2, uColor1, pulse);
    gl_FragColor = vec4(color, ring * pulse * 0.9);
  }
`;

export const BUILTIN_SHADERS: Record<string, { vertex: string; fragment: string }> = {
  fire: { vertex: FIRE_VERTEX, fragment: FIRE_FRAGMENT },
  lightning: { vertex: LIGHTNING_VERTEX, fragment: LIGHTNING_FRAGMENT },
  shockwave: { vertex: SHOCKWAVE_VERTEX, fragment: SHOCKWAVE_FRAGMENT },
  magic: { vertex: MAGIC_VERTEX, fragment: MAGIC_FRAGMENT },
};