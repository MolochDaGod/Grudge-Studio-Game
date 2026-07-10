/**
 * CombatEffects — battle VFX layer for Grudge Tactics.
 *
 * Improvements:
 *  - Additive blending + depthWrite:false for punchy dark-grid read
 *  - Ease curves on projectiles / shockwaves
 *  - Longer trails, multi-ring impacts, sparkle accents
 *  - Nature / beast / shockwave effect types (were referenced but missing)
 *  - Clean JSX (repairs corrupted spacing that broke builds)
 */
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export type EffectType =
  | 'fire_projectile'
  | 'dark_projectile'
  | 'ice_projectile'
  | 'arrow'
  | 'physical_slash'
  | 'heal_burst'
  | 'aoe_ring'
  | 'ultimate_nova'
  | 'status_stun'
  | 'status_poison'
  | 'status_freeze'
  | 'impact_flash'
  | 'magic_beam'
  | 'crit_burst'
  | 'fire_explosion'
  | 'ice_shatter'
  | 'dark_void'
  | 'lightning_arc'
  | 'ground_slam'
  | 'magic_circle'
  | 'energy_charge'
  | 'heal_ring'
  | 'buff_aura'
  | 'nature_projectile'
  | 'beast_javelin'
  | 'shockwave';

export interface CombatEffectData {
  id: string;
  type: EffectType;
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  isAoe?: boolean;
  createdAt: number;
  duration: number;
}

interface EffectProps {
  effect: CombatEffectData;
}

function progress(effect: CombatEffectData): number {
  return Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

const ADD = THREE.AdditiveBlending;

// ── Projectile ───────────────────────────────────────────────────────────────
const TRAIL_COUNT = 8;

function Projectile({ effect }: EffectProps) {
  const ref = useRef<THREE.Group>(null!);
  const trailRefs = useRef<THREE.Mesh[]>([]);
  const from = useMemo(() => new THREE.Vector3(...effect.from), [effect.from[0], effect.from[1], effect.from[2]]);
  const to = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const arcH = Math.max(1.5, from.distanceTo(to) * 0.2);

  const isFire = effect.type === 'fire_projectile';
  const isDark = effect.type === 'dark_projectile';
  const isIce = effect.type === 'ice_projectile';

  useFrame(() => {
    if (!ref.current) return;
    const t = progress(effect);
    const e = easeInOut(t);
    const x = THREE.MathUtils.lerp(from.x, to.x, e);
    const z = THREE.MathUtils.lerp(from.z, to.z, e);
    const y = THREE.MathUtils.lerp(from.y, to.y, e) + arcH * Math.sin(t * Math.PI);
    ref.current.position.set(x, y, z);
    if (t < 0.98) {
      const dt = Math.min(1, t + 0.03);
      const de = easeInOut(dt);
      ref.current.lookAt(
        THREE.MathUtils.lerp(from.x, to.x, de),
        THREE.MathUtils.lerp(from.y, to.y, de) + arcH * Math.sin(dt * Math.PI),
        THREE.MathUtils.lerp(from.z, to.z, de),
      );
    }
    if (isDark) ref.current.rotation.z += 0.08;
    if (isFire) ref.current.rotation.z += 0.05;

    const opacity = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
    ref.current.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) {
        o.material.opacity = Math.max(0, opacity * (o.userData.baseOpacity ?? 1));
      }
    });
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const mesh = trailRefs.current[i];
      if (!mesh) continue;
      const tt = Math.max(0, e - (i + 1) * 0.055);
      mesh.position.set(
        THREE.MathUtils.lerp(from.x, to.x, tt),
        THREE.MathUtils.lerp(from.y, to.y, tt) + arcH * Math.sin(tt * Math.PI),
        THREE.MathUtils.lerp(from.z, to.z, tt),
      );
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        (1 - i / TRAIL_COUNT) * opacity * 0.55,
      );
      mesh.scale.setScalar(Math.max(0.01, 0.85 - i * 0.1));
    }
  });

  const coreR = isFire ? 0.22 : 0.14;
  const outerR = isFire ? 0.4 : 0.26;
  const trailR = isFire ? 0.14 : 0.09;
  const lightI = isFire ? 4 : isDark ? 2.4 : 2.8;

  return (
    <>
      <group ref={ref} position={effect.from}>
        <mesh userData={{ baseOpacity: 1 }}>
          <sphereGeometry args={[coreR, 12, 12]} />
          <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
        </mesh>
        <mesh userData={{ baseOpacity: 0.32 }}>
          <sphereGeometry args={[outerR, 10, 10]} />
          <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
        </mesh>
        {isDark && (
          <mesh rotation={[Math.PI / 2, 0, 0]} userData={{ baseOpacity: 0.7 }}>
            <torusGeometry args={[outerR * 1.35, 0.045, 8, 24]} />
            <meshBasicMaterial color="#cc00ff" transparent depthWrite={false} blending={ADD} />
          </mesh>
        )}
        {isIce && (
          <mesh position={[0, 0, coreR + 0.14]} userData={{ baseOpacity: 0.92 }}>
            <coneGeometry args={[0.08, 0.34, 6]} />
            <meshBasicMaterial color="#eafaff" transparent depthWrite={false} blending={ADD} />
          </mesh>
        )}
        {isFire && (
          <mesh userData={{ baseOpacity: 0.75 }}>
            <sphereGeometry args={[coreR * 0.5, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent depthWrite={false} blending={ADD} />
          </mesh>
        )}
        <pointLight color={effect.color} intensity={lightI} distance={3.5} decay={2} />
      </group>
      {Array.from({ length: TRAIL_COUNT }, (_, i) => (
        <mesh key={i} ref={(el) => { if (el) trailRefs.current[i] = el; }}>
          <sphereGeometry args={[trailR, 6, 6]} />
          <meshBasicMaterial color={effect.color} transparent opacity={0} depthWrite={false} blending={ADD} />
        </mesh>
      ))}
    </>
  );
}

// ── Arrow ────────────────────────────────────────────────────────────────────
function Arrow({ effect }: EffectProps) {
  const ref = useRef<THREE.Group>(null!);
  const from = useMemo(() => new THREE.Vector3(...effect.from), [effect.from[0], effect.from[1], effect.from[2]]);
  const to = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);

  useFrame(() => {
    if (!ref.current) return;
    const t = progress(effect);
    const e = easeInOut(t);
    const x = THREE.MathUtils.lerp(from.x, to.x, e);
    const z = THREE.MathUtils.lerp(from.z, to.z, e);
    const y = THREE.MathUtils.lerp(from.y, to.y, e) + 0.85 * Math.sin(t * Math.PI);
    ref.current.position.set(x, y, z);
    ref.current.lookAt(to.x, to.y + 0.5, to.z);
    const opacity = t < 0.88 ? 1 : 1 - (t - 0.88) / 0.12;
    ref.current.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) {
        o.material.opacity = Math.max(0, opacity);
      }
    });
  });

  return (
    <group ref={ref} position={effect.from}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.95, 6]} />
        <meshBasicMaterial color="#c8a050" transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.22, 6]} />
        <meshBasicMaterial color="#e8c070" transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.07, 0.16, 4]} />
        <meshBasicMaterial color="#8a6040" transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ── Physical slash ───────────────────────────────────────────────────────────
const SLASH_SPARKS = 8;

function PhysicalSlash({ effect }: EffectProps) {
  const arcs = [useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!)];
  const sparks = useRef<THREE.Mesh[]>([]);
  const origin = useMemo(() => new THREE.Vector3(...effect.from), [effect.from[0], effect.from[1], effect.from[2]]);

  useFrame(() => {
    const t = progress(effect);
    arcs.forEach((r, i) => {
      if (!r.current) return;
      const td = Math.max(0, t - i * 0.1);
      r.current.scale.setScalar(0.15 + td * (1.55 - i * 0.12));
      (r.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 - td * 1.35 - i * 0.12);
      r.current.rotation.z += 0.14 - i * 0.02;
    });
    sparks.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / SLASH_SPARKS) * Math.PI * 2;
      const r = t * 1.45;
      mesh.position.set(origin.x + Math.cos(angle) * r, origin.y + 0.95 + t * 0.5, origin.z + Math.sin(angle) * r);
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - t * 1.15);
      mesh.scale.setScalar(Math.max(0.01, 0.14 - t * 0.13));
    });
  });

  return (
    <>
      {[0.3, 0.42, 0.54].map((radius, i) => (
        <mesh
          key={i}
          ref={arcs[i]}
          position={[origin.x, origin.y + 0.8 + i * 0.15, origin.z]}
          rotation={[0, 0, i * 0.4 * Math.PI]}
        >
          <torusGeometry args={[radius, 0.05 - i * 0.008, 6, 16, Math.PI * 1.35]} />
          <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
        </mesh>
      ))}
      {Array.from({ length: SLASH_SPARKS }, (_, i) => (
        <mesh key={`s${i}`} ref={(el) => { if (el) sparks.current[i] = el; }} position={[origin.x, origin.y + 0.9, origin.z]}>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
        </mesh>
      ))}
      <Sparkles count={12} scale={1.4} size={3} speed={2.5} color={effect.color} position={[origin.x, origin.y + 1, origin.z]} />
    </>
  );
}

// ── Impact flash ─────────────────────────────────────────────────────────────
function ImpactFlash({ effect }: EffectProps) {
  const core = useRef<THREE.Mesh>(null!);
  const outer = useRef<THREE.Mesh>(null!);
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);

  useFrame(() => {
    const t = progress(effect);
    const e = easeOutCubic(t);
    if (core.current) {
      core.current.scale.setScalar(1 + e * 2.8);
      (core.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.92 - t * 1.15);
    }
    if (outer.current) {
      outer.current.scale.setScalar(1 + e * 4.2);
      (outer.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.5 - t * 0.75);
    }
    if (ring1.current) {
      ring1.current.scale.setScalar(1 + e * 5.5);
      (ring1.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.78 - t * 1.1);
    }
    if (ring2.current) {
      ring2.current.scale.setScalar(1 + e * 8.5);
      (ring2.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.4 - t * 0.7);
    }
  });

  return (
    <group position={[target.x, target.y + 0.5, target.z]}>
      <mesh ref={core}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={outer}>
        <sphereGeometry args={[0.36, 10, 10]} />
        <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={ring1} position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.34, 40]} />
        <meshBasicMaterial color={effect.color} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={ring2} position={[0, -0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.4, 40]} />
        <meshBasicMaterial color="#ffffff" transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <pointLight color={effect.color} intensity={5} distance={5.5} decay={2} />
    </group>
  );
}

// ── AoE ring ─────────────────────────────────────────────────────────────────
function AoeRing({ effect }: EffectProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const glow = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);

  useFrame(() => {
    const t = progress(effect);
    const e = easeOutCubic(t);
    if (ref.current) {
      ref.current.scale.setScalar(1 + e * 3.8);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 - t * 0.9);
    }
    if (glow.current) {
      glow.current.scale.setScalar(1 + e * 3.2);
      (glow.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.35 - t * 0.45);
    }
  });

  return (
    <group position={[target.x, 0.08, target.z]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.95, 48]} />
        <meshBasicMaterial color={effect.color} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshBasicMaterial color={effect.color} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
    </group>
  );
}

// ── Heal burst ───────────────────────────────────────────────────────────────
function HealBurst({ effect }: EffectProps) {
  const refs = useRef<THREE.Mesh[]>([]);
  const target = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const COUNT = 10;
  const angles = useMemo(() => Array.from({ length: COUNT }, (_, i) => (i / COUNT) * Math.PI * 2), []);

  useFrame(() => {
    const t = progress(effect);
    const e = easeOutCubic(t);
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const r = 0.3 + e * 0.65;
      mesh.position.set(
        target.x + Math.cos(angles[i]) * r,
        target.y + 0.25 + e * 1.7,
        target.z + Math.sin(angles[i]) * r,
      );
      mesh.scale.setScalar(Math.max(0.05, 1 - t));
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t * 1.15);
    });
  });

  return (
    <>
      {angles.map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) refs.current[i] = el; }} position={[target.x, target.y, target.z]}>
          <sphereGeometry args={[0.07, 6, 6]} />
          <meshBasicMaterial color="#00ff88" transparent depthWrite={false} blending={ADD} />
        </mesh>
      ))}
      <mesh position={[target.x, target.y + 0.35, target.z]}>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.18} depthWrite={false} blending={ADD} />
      </mesh>
      <Sparkles count={22} scale={1.6} size={3.5} speed={2} color="#44ffaa" position={[target.x, target.y + 0.6, target.z]} />
    </>
  );
}

// ── Ultimate nova ────────────────────────────────────────────────────────────
function UltimateNova({ effect }: EffectProps) {
  const sphere = useRef<THREE.Mesh>(null!);
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);

  useFrame(() => {
    const t = progress(effect);
    const e = easeOutCubic(t);
    if (sphere.current) {
      sphere.current.scale.setScalar(1 + e * 5.5);
      (sphere.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.65 - t * 0.75);
    }
    if (ring1.current) {
      ring1.current.scale.setScalar(1 + e * 6.5);
      (ring1.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - t);
    }
    if (ring2.current) {
      ring2.current.scale.setScalar(1 + e * 9.5);
      (ring2.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.5 - t * 0.7);
    }
  });

  return (
    <group position={[target.x, target.y, target.z]}>
      <mesh ref={sphere} position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={ring1} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.95, 48]} />
        <meshBasicMaterial color={effect.color} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={ring2} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.8, 48]} />
        <meshBasicMaterial color="#ffffff" transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <pointLight color={effect.color} intensity={9} distance={11} decay={1.5} />
      <Sparkles count={30} scale={3} size={4} speed={2.5} color={effect.color} position={[0, 0.8, 0]} />
    </group>
  );
}

// ── Magic beam ───────────────────────────────────────────────────────────────
function MagicBeam({ effect }: EffectProps) {
  const beam = useRef<THREE.Mesh>(null!);
  const glow = useRef<THREE.Mesh>(null!);
  const from = useMemo(() => new THREE.Vector3(...effect.from), [effect.from[0], effect.from[1], effect.from[2]]);
  const to = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const mid = useMemo(() => from.clone().lerp(to, 0.5), [from, to]);
  const dist = useMemo(() => from.distanceTo(to), [from, to]);
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    return q;
  }, [from, to]);

  useFrame(() => {
    const t = progress(effect);
    const opacity = t < 0.7 ? 0.9 : 0.9 * (1 - (t - 0.7) / 0.3);
    const pulse = 1 + 0.18 * Math.sin(t * Math.PI * 10);
    if (beam.current) {
      (beam.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity);
      beam.current.scale.set(pulse, 1, pulse);
    }
    if (glow.current) {
      (glow.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity * 0.35);
      glow.current.scale.set(pulse * 1.7, 1, pulse * 1.7);
    }
  });

  return (
    <group position={[mid.x, mid.y + 0.85, mid.z]} quaternion={quat}>
      <mesh ref={beam}>
        <cylinderGeometry args={[0.07, 0.07, dist, 8]} />
        <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={glow}>
        <cylinderGeometry args={[0.18, 0.18, dist, 8]} />
        <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
      </mesh>
      <pointLight color={effect.color} intensity={4.5} distance={5} decay={2} position={[0, dist / 2, 0]} />
    </group>
  );
}

// ── Status burst ─────────────────────────────────────────────────────────────
function StatusBurst({ effect }: EffectProps) {
  const refs = useRef<THREE.Mesh[]>([]);
  const target = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const COUNT = 7;
  const angles = useMemo(() => Array.from({ length: COUNT }, (_, i) => (i / COUNT) * Math.PI * 2), []);

  useFrame(() => {
    const t = progress(effect);
    const e = easeOutCubic(t);
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const r = 0.45 + e * 0.95;
      mesh.position.set(
        target.x + Math.cos(angles[i]) * r,
        target.y + 0.55 + e * 0.5,
        target.z + Math.sin(angles[i]) * r,
      );
      mesh.scale.setScalar(Math.max(0.05, 0.16 * (1 - t)));
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t * 1.2);
      mesh.rotation.y += 0.08;
    });
  });

  return (
    <>
      {angles.map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) refs.current[i] = el; }}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
        </mesh>
      ))}
    </>
  );
}

// ── Crit burst ───────────────────────────────────────────────────────────────
function CritBurst({ effect }: EffectProps) {
  const slashes = useRef<THREE.Mesh[]>([]);
  const ring = useRef<THREE.Mesh>(null!);
  const inner = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const N = 6;

  useFrame(() => {
    const t = progress(effect);
    const e = easeOutCubic(t);
    slashes.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.scale.setScalar(0.12 + e * 2);
      mesh.rotation.z = (i / N) * Math.PI * 2 + t * 0.7;
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 - t * 1.1);
    });
    if (ring.current) {
      ring.current.scale.setScalar(1 + e * 5);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - t);
    }
    if (inner.current) {
      inner.current.scale.setScalar(1 + e * 2.4);
      (inner.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - t * 0.95);
    }
  });

  return (
    <group position={[target.x, target.y + 0.55, target.z]}>
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} ref={(el) => { if (el) slashes.current[i] = el; }} rotation={[0, 0, (i / N) * Math.PI * 2]}>
          <torusGeometry args={[0.42, 0.055, 6, 12, Math.PI * 0.72]} />
          <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
        </mesh>
      ))}
      <mesh ref={ring} position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.28, 40]} />
        <meshBasicMaterial color={effect.color} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={inner}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent depthWrite={false} blending={ADD} />
      </mesh>
      <pointLight color={effect.color} intensity={8} distance={6.5} decay={2} />
      <Sparkles count={26} scale={2} size={4} speed={2.4} color={effect.color} />
    </group>
  );
}

// ── Fire explosion ───────────────────────────────────────────────────────────
function FireExplosion({ effect }: EffectProps) {
  const core = useRef<THREE.Mesh>(null!);
  const outer = useRef<THREE.Mesh>(null!);
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);

  useFrame(() => {
    const t = progress(effect);
    const e = easeOutCubic(t);
    if (core.current) {
      core.current.scale.setScalar(1 + e * 3.4);
      (core.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.92 - t);
    }
    if (outer.current) {
      outer.current.scale.setScalar(1 + e * 5.8);
      (outer.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.48 - t * 0.65);
    }
    if (ring1.current) {
      ring1.current.scale.setScalar(1 + e * 7);
      (ring1.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.82 - t);
    }
    if (ring2.current) {
      ring2.current.scale.setScalar(1 + e * 10.5);
      (ring2.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.38 - t * 0.55);
    }
  });

  return (
    <group position={[target.x, target.y + 0.5, target.z]}>
      <mesh ref={core}>
        <sphereGeometry args={[0.42, 14, 14]} />
        <meshBasicMaterial color="#ff8800" transparent depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={outer}>
        <sphereGeometry args={[0.58, 12, 12]} />
        <meshBasicMaterial color="#ff4400" transparent depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={ring1} position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.58, 40]} />
        <meshBasicMaterial color="#ff6600" transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={ring2} position={[0, -0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.65, 40]} />
        <meshBasicMaterial color="#ffaa00" transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <pointLight color="#ff6600" intensity={10} distance={9} decay={1.5} />
      <Sparkles count={32} scale={2.6} size={4.5} speed={3} color="#ff9900" />
    </group>
  );
}

// ── Ice shatter ──────────────────────────────────────────────────────────────
function IceShatter({ effect }: EffectProps) {
  const spikes = useRef<THREE.Mesh[]>([]);
  const shards = useRef<THREE.Mesh[]>([]);
  const ring = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const N = 7;

  useFrame(() => {
    const t = progress(effect);
    const phase = t < 0.5 ? t * 2 : 1;
    const burst = t > 0.5 ? (t - 0.5) * 2 : 0;
    spikes.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / N) * Math.PI * 2;
      const r = (1 - phase) * 1.85 + burst * 2.3;
      mesh.position.set(
        target.x + Math.cos(angle) * r,
        target.y + 0.65 + (1 - phase) * 0.3,
        target.z + Math.sin(angle) * r,
      );
      mesh.rotation.y = angle + Math.PI;
      mesh.rotation.x = -Math.PI / 4 + burst * 0.85;
      mesh.scale.setScalar(Math.max(0.01, 1 - burst * 1.2));
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.92 - burst * 1.1);
    });
    shards.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / 10) * Math.PI * 2 + 0.35;
      const r = burst * 1.7;
      mesh.position.set(target.x + Math.cos(angle) * r, target.y + 0.4 + burst * 1.3, target.z + Math.sin(angle) * r);
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, burst > 0.08 ? 0.85 - burst * 0.95 : 0);
      mesh.scale.setScalar(Math.max(0.01, 0.16 - burst * 0.14));
    });
    if (ring.current) {
      ring.current.scale.setScalar(1 + burst * 5.5);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.72 - burst * 0.9);
    }
  });

  return (
    <>
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} ref={(el) => { if (el) spikes.current[i] = el; }} position={[target.x, target.y + 0.6, target.z]}>
          <coneGeometry args={[0.09, 0.58, 6]} />
          <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
        </mesh>
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={`sh${i}`} ref={(el) => { if (el) shards.current[i] = el; }} position={[target.x, target.y + 0.4, target.z]}>
          <octahedronGeometry args={[0.1]} />
          <meshBasicMaterial color="#eafaff" transparent opacity={0} depthWrite={false} blending={ADD} />
        </mesh>
      ))}
      <mesh ref={ring} position={[target.x, target.y + 0.05, target.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.22, 40]} />
        <meshBasicMaterial color={effect.color} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <pointLight color={effect.color} intensity={6.5} distance={5.5} decay={2} />
      <Sparkles count={20} scale={1.6} size={3.2} speed={1.8} color="#ccefff" position={[target.x, target.y + 0.7, target.z]} />
    </>
  );
}

// ── Dark void ────────────────────────────────────────────────────────────────
function DarkVoid({ effect }: EffectProps) {
  const rings = useRef<THREE.Mesh[]>([]);
  const core = useRef<THREE.Mesh>(null!);
  const glow = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const N = 4;

  useFrame(() => {
    const t = progress(effect);
    rings.current.forEach((mesh, i) => {
      if (!mesh) return;
      const td = Math.max(0, t - i * 0.1);
      mesh.scale.setScalar(0.45 + td * 3.6);
      mesh.rotation.z += 0.07 + i * 0.025;
      mesh.rotation.x = (Math.PI / 2) * (1 - td * 0.35);
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.78 - td * 0.88);
    });
    if (core.current) {
      core.current.scale.setScalar(0.3 + t * 1.9);
      core.current.rotation.y += 0.09;
      (core.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.88 - t * 0.92);
    }
    if (glow.current) {
      glow.current.scale.setScalar(0.75 + t * 2.6);
      (glow.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.36 - t * 0.45);
    }
  });

  return (
    <group position={[target.x, target.y + 0.5, target.z]}>
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} ref={(el) => { if (el) rings.current[i] = el; }} rotation={[Math.PI / 2, 0, (i / N) * Math.PI]}>
          <torusGeometry args={[0.4 + i * 0.12, 0.045, 8, 36]} />
          <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
        </mesh>
      ))}
      <mesh ref={core}>
        <sphereGeometry args={[0.24, 14, 14]} />
        <meshBasicMaterial color="#cc00ff" transparent depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={glow}>
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
      </mesh>
      <pointLight color="#aa00ff" intensity={8.5} distance={7.5} decay={1.5} />
      <Sparkles count={22} scale={2.1} size={3.5} speed={2.1} color="#cc00ff" />
    </group>
  );
}

// ── Lightning ────────────────────────────────────────────────────────────────
function LightningArc({ effect }: EffectProps) {
  const segs = useRef<THREE.Mesh[]>([]);
  const flash = useRef<THREE.Mesh>(null!);
  const from = useMemo(() => new THREE.Vector3(...effect.from), [effect.from[0], effect.from[1], effect.from[2]]);
  const to = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const N = 10;

  useFrame(() => {
    const t = progress(effect);
    const flicker = Math.sin(performance.now() * 0.045) * 0.5 + 0.5;
    const opacity = Math.max(0, (t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28) * (0.55 + flicker * 0.45));
    segs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const pct = i / (N - 1);
      const jitter = (1 - t) * 0.4 * (Math.sin(performance.now() * 0.02 + i * 1.7) * 0.5);
      mesh.position.set(
        THREE.MathUtils.lerp(from.x, to.x, pct) + jitter,
        THREE.MathUtils.lerp(from.y + 0.95, to.y + 0.95, pct) + jitter * 0.6,
        THREE.MathUtils.lerp(from.z, to.z, pct) + jitter,
      );
      mesh.scale.setScalar(Math.max(0.01, 0.2 + flicker * 0.14));
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    });
    if (flash.current) {
      flash.current.position.set(to.x, to.y + 0.75, to.z);
      flash.current.scale.setScalar(Math.max(0.01, (0.45 + flicker * 0.65) * (1 - t)));
      (flash.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity * 0.85);
    }
  });

  return (
    <>
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} ref={(el) => { if (el) segs.current[i] = el; }}>
          <sphereGeometry args={[0.13, 6, 6]} />
          <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
        </mesh>
      ))}
      <mesh ref={flash} position={[to.x, to.y + 0.75, to.z]}>
        <sphereGeometry args={[0.38, 10, 10]} />
        <meshBasicMaterial color="#ffffff" transparent depthWrite={false} blending={ADD} />
      </mesh>
      <pointLight
        color={effect.color}
        intensity={7}
        distance={6.5}
        decay={2}
        position={[
          THREE.MathUtils.lerp(from.x, to.x, 0.5),
          THREE.MathUtils.lerp(from.y, to.y, 0.5) + 0.95,
          THREE.MathUtils.lerp(from.z, to.z, 0.5),
        ]}
      />
      <Sparkles count={16} scale={1.5} size={3.2} speed={3.2} color={effect.color} position={[to.x, to.y + 0.8, to.z]} />
    </>
  );
}

// ── Ground slam ──────────────────────────────────────────────────────────────
function GroundSlam({ effect }: EffectProps) {
  const rings = [useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!)];
  const debris = useRef<THREE.Mesh[]>([]);
  const dust = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const N = 8;

  useFrame(() => {
    const t = progress(effect);
    const scales = [7.5, 5.8, 4.2];
    rings.forEach((r, i) => {
      if (!r.current) return;
      const td = Math.max(0, t - i * 0.1);
      const e = easeOutCubic(td);
      r.current.scale.setScalar(1 + e * scales[i]);
      (r.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (0.9 - i * 0.2) - td * 0.95);
    });
    debris.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / N) * Math.PI * 2;
      const r = t * 1.7;
      const rise = Math.max(0, t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6);
      mesh.position.set(target.x + Math.cos(angle) * r, target.y + rise * 1.25, target.z + Math.sin(angle) * r);
      mesh.scale.setScalar(Math.max(0.01, 0.2 - t * 0.16));
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.88 - t * 0.95);
    });
    if (dust.current) {
      dust.current.scale.setScalar(1 + easeOutCubic(t) * 3.4);
      (dust.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.32 - t * 0.4);
    }
  });

  return (
    <>
      {[0.05, 0.06, 0.07].map((y, i) => (
        <mesh key={i} ref={rings[i]} position={[target.x, target.y + y, target.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1 + i * 0.05, 0.24 + i * 0.06, 48]} />
          <meshBasicMaterial color={effect.color} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
        </mesh>
      ))}
      {Array.from({ length: N }, (_, i) => (
        <mesh key={`d${i}`} ref={(el) => { if (el) debris.current[i] = el; }} position={[target.x, target.y, target.z]}>
          <coneGeometry args={[0.07, 0.24, 5]} />
          <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
        </mesh>
      ))}
      <mesh ref={dust} position={[target.x, target.y + 0.12, target.z]}>
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
      </mesh>
      <pointLight color={effect.color} intensity={8.5} distance={6.5} decay={2} />
    </>
  );
}

// ── Magic circle ─────────────────────────────────────────────────────────────
function MagicCircle({ effect }: EffectProps) {
  const r1 = useRef<THREE.Mesh>(null!);
  const r2 = useRef<THREE.Mesh>(null!);
  const r3 = useRef<THREE.Mesh>(null!);
  const glow = useRef<THREE.Mesh>(null!);
  const pos = useMemo(() => new THREE.Vector3(...effect.from), [effect.from[0], effect.from[1], effect.from[2]]);

  useFrame(() => {
    const t = progress(effect);
    const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    const grow = Math.min(1, t * 4);
    if (r1.current) {
      r1.current.rotation.z += 0.06;
      r1.current.scale.setScalar(Math.max(0.01, grow));
      (r1.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * fade;
    }
    if (r2.current) {
      r2.current.rotation.z -= 0.04;
      r2.current.scale.setScalar(Math.max(0.01, grow * 0.92));
      (r2.current.material as THREE.MeshBasicMaterial).opacity = 0.62 * fade;
    }
    if (r3.current) {
      r3.current.rotation.z += 0.028;
      r3.current.scale.setScalar(Math.max(0.01, grow * 1.18));
      (r3.current.material as THREE.MeshBasicMaterial).opacity = 0.38 * fade;
    }
    if (glow.current) {
      glow.current.scale.setScalar(Math.max(0.01, grow * (1 + 0.1 * Math.sin(t * Math.PI * 12))));
      (glow.current.material as THREE.MeshBasicMaterial).opacity = 0.22 * fade;
    }
  });

  return (
    <>
      <mesh ref={r1} position={[pos.x, pos.y + 0.05, pos.z]} rotation={[-Math.PI / 2, 0, 0]} scale={0.01}>
        <ringGeometry args={[0.48, 0.64, 32]} />
        <meshBasicMaterial color={effect.color} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={r2} position={[pos.x, pos.y + 0.07, pos.z]} rotation={[-Math.PI / 2, 0, 0]} scale={0.01}>
        <ringGeometry args={[0.72, 0.86, 40]} />
        <meshBasicMaterial color={effect.color} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={r3} position={[pos.x, pos.y + 0.09, pos.z]} rotation={[-Math.PI / 2, 0, 0]} scale={0.01}>
        <ringGeometry args={[0.96, 1.12, 48]} />
        <meshBasicMaterial color={effect.color} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={glow} position={[pos.x, pos.y + 0.04, pos.z]} rotation={[-Math.PI / 2, 0, 0]} scale={0.01}>
        <circleGeometry args={[1.18, 40]} />
        <meshBasicMaterial color={effect.color} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <Sparkles position={[pos.x, pos.y + 0.12, pos.z]} count={24} scale={2.6} size={3.5} speed={0.8} color={effect.color} />
      <pointLight position={[pos.x, pos.y + 0.55, pos.z]} color={effect.color} intensity={5.5} distance={4.5} decay={2} />
    </>
  );
}

// ── Energy charge ────────────────────────────────────────────────────────────
function EnergyCharge({ effect }: EffectProps) {
  const core = useRef<THREE.Mesh>(null!);
  const orbits = useRef<THREE.Mesh[]>([]);
  const pos = useMemo(() => new THREE.Vector3(...effect.from), [effect.from[0], effect.from[1], effect.from[2]]);

  useFrame(() => {
    const t = progress(effect);
    const burstT = Math.max(0, (t - 0.78) / 0.22);
    const chargeT = Math.min(1, t / 0.78);
    const pulse = 1 + 0.2 * Math.sin(chargeT * Math.PI * 8);
    const coreScale = Math.max(0.01, chargeT * pulse * (1 + burstT * 2.8));
    const fade = t > 0.82 ? 1 - (t - 0.82) / 0.18 : 1;
    if (core.current) {
      core.current.scale.setScalar(coreScale);
      (core.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * fade);
    }
    orbits.current.forEach((m, i) => {
      if (!m) return;
      const angle = (i / 5) * Math.PI * 2 + t * Math.PI * 5.5;
      const radius = 0.3 + chargeT * 0.24;
      m.position.set(
        pos.x + Math.cos(angle) * radius,
        pos.y + 1.35 + Math.sin(angle * 1.5) * 0.14,
        pos.z + Math.sin(angle) * radius,
      );
      m.scale.setScalar(Math.max(0.01, (0.08 + chargeT * 0.08) * (1 + burstT)));
      (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, fade);
    });
  });

  return (
    <>
      <mesh ref={core} position={[pos.x, pos.y + 1.35, pos.z]} scale={0.01}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} ref={(el) => { if (el) orbits.current[i] = el; }} position={[pos.x, pos.y + 1.35, pos.z]}>
          <sphereGeometry args={[0.075, 10, 10]} />
          <meshBasicMaterial color={effect.color} transparent depthWrite={false} blending={ADD} />
        </mesh>
      ))}
      <Sparkles position={[pos.x, pos.y + 1.35, pos.z]} count={20} scale={1.5} size={5} speed={1.5} color={effect.color} />
      <pointLight position={[pos.x, pos.y + 1.35, pos.z]} color={effect.color} intensity={7.5} distance={4.2} decay={2} />
    </>
  );
}

// ── Heal ring ────────────────────────────────────────────────────────────────
function HealRing({ effect }: EffectProps) {
  const ring = useRef<THREE.Mesh>(null!);
  const pos = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);

  useFrame(() => {
    if (!ring.current) return;
    const t = progress(effect);
    const e = easeOutCubic(t);
    ring.current.scale.setScalar(0.3 + e * 2);
    ring.current.position.y = 0.1 + e * 0.55;
    (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 * (1 - t));
  });

  return (
    <>
      <mesh ref={ring} position={[pos.x, 0.1, pos.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.72, 40]} />
        <meshBasicMaterial color="#00ff66" transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <Sparkles position={[pos.x, pos.y + 0.85, pos.z]} count={26} scale={1.9} size={6} speed={2.1} color="#44ff88" />
      <pointLight position={[pos.x, pos.y + 1.0, pos.z]} color="#00ff66" intensity={5.5} distance={4.2} decay={2} />
    </>
  );
}

// ── Buff aura ────────────────────────────────────────────────────────────────
function BuffAura({ effect }: EffectProps) {
  const col = useRef<THREE.Mesh>(null!);
  const pos = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const color = effect.color || '#4488ff';

  useFrame(() => {
    if (!col.current) return;
    const t = progress(effect);
    const e = easeOutCubic(t);
    const h = 0.55 + e * 2.6;
    col.current.scale.set(0.65, h, 0.65);
    col.current.position.y = h * 0.5;
    (col.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.48 * (1 - t * 0.72));
  });

  return (
    <>
      <mesh ref={col} position={[pos.x, 0.5, pos.z]}>
        <cylinderGeometry args={[0.38, 0.58, 1, 20, 1, true]} />
        <meshBasicMaterial color={color} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <Sparkles position={[pos.x, pos.y + 1.25, pos.z]} count={22} scale={1.6} size={5} speed={1.9} color={color} />
      <pointLight position={[pos.x, pos.y + 1.55, pos.z]} color={color} intensity={4.5} distance={3.8} decay={2} />
    </>
  );
}

// ── Nature projectile ────────────────────────────────────────────────────────
function NatureProjectile({ effect }: EffectProps) {
  const ref = useRef<THREE.Group>(null!);
  const trails = useRef<THREE.Mesh[]>([]);
  const from = useMemo(() => new THREE.Vector3(...effect.from), [effect.from[0], effect.from[1], effect.from[2]]);
  const to = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const arcH = Math.max(1.2, from.distanceTo(to) * 0.22);
  const col = effect.color || '#44ff88';
  const N = 6;

  useFrame(() => {
    if (!ref.current) return;
    const t = progress(effect);
    const e = easeOutCubic(t);
    const x = THREE.MathUtils.lerp(from.x, to.x, e);
    const z = THREE.MathUtils.lerp(from.z, to.z, e);
    const y = THREE.MathUtils.lerp(from.y, to.y, e) + arcH * Math.sin(t * Math.PI);
    ref.current.position.set(x, y, z);
    ref.current.rotation.y += 0.14;
    ref.current.rotation.z = Math.sin(t * Math.PI * 4) * 0.28;
    const opacity = t < 0.82 ? 1 : 1 - (t - 0.82) / 0.18;
    ref.current.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) {
        o.material.opacity = Math.max(0, opacity * (o.userData.baseOpacity ?? 1));
      }
    });
    for (let i = 0; i < N; i++) {
      const mesh = trails.current[i];
      if (!mesh) continue;
      const tt = Math.max(0, e - (i + 1) * 0.06);
      mesh.position.set(
        THREE.MathUtils.lerp(from.x, to.x, tt),
        THREE.MathUtils.lerp(from.y, to.y, tt) + arcH * Math.sin(tt * Math.PI),
        THREE.MathUtils.lerp(from.z, to.z, tt),
      );
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - i / N) * opacity * 0.5);
      mesh.scale.setScalar(Math.max(0.01, 0.9 - i * 0.12));
    }
  });

  return (
    <>
      <group ref={ref} position={effect.from}>
        <mesh userData={{ baseOpacity: 1 }}>
          <octahedronGeometry args={[0.17, 0]} />
          <meshBasicMaterial color={col} transparent depthWrite={false} blending={ADD} />
        </mesh>
        <mesh scale={1.65} userData={{ baseOpacity: 0.28 }}>
          <octahedronGeometry args={[0.17, 0]} />
          <meshBasicMaterial color={col} transparent depthWrite={false} blending={ADD} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} userData={{ baseOpacity: 0.55 }}>
          <torusGeometry args={[0.24, 0.035, 6, 18]} />
          <meshBasicMaterial color="#aaffcc" transparent depthWrite={false} blending={ADD} />
        </mesh>
        <pointLight color={col} intensity={3} distance={3.6} decay={2} />
      </group>
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} ref={(el) => { if (el) trails.current[i] = el; }}>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshBasicMaterial color={col} transparent opacity={0} depthWrite={false} blending={ADD} />
        </mesh>
      ))}
    </>
  );
}

// ── Beast javelin ────────────────────────────────────────────────────────────
function BeastJavelin({ effect }: EffectProps) {
  const ref = useRef<THREE.Group>(null!);
  const from = useMemo(() => new THREE.Vector3(...effect.from), [effect.from[0], effect.from[1], effect.from[2]]);
  const to = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const col = effect.color || '#c8a060';

  useFrame(() => {
    if (!ref.current) return;
    const t = progress(effect);
    const e = easeInOut(t);
    const x = THREE.MathUtils.lerp(from.x, to.x, e);
    const z = THREE.MathUtils.lerp(from.z, to.z, e);
    const y = THREE.MathUtils.lerp(from.y, to.y, e) + 0.95 * Math.sin(t * Math.PI);
    ref.current.position.set(x, y, z);
    ref.current.lookAt(to.x, to.y + 0.5, to.z);
    const opacity = t < 0.88 ? 1 : 1 - (t - 0.88) / 0.12;
    ref.current.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) {
        o.material.opacity = Math.max(0, opacity);
      }
    });
  });

  return (
    <group ref={ref} position={effect.from}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 1.1, 6]} />
        <meshBasicMaterial color={col} transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.58]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.075, 0.3, 6]} />
        <meshBasicMaterial color="#e8d0a0" transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -0.48]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.085, 0.2, 4]} />
        <meshBasicMaterial color="#8a6040" transparent depthWrite={false} />
      </mesh>
      <pointLight color={col} intensity={1.8} distance={2.6} decay={2} />
    </group>
  );
}

// ── Shockwave ────────────────────────────────────────────────────────────────
function Shockwave({ effect }: EffectProps) {
  const r1 = useRef<THREE.Mesh>(null!);
  const r2 = useRef<THREE.Mesh>(null!);
  const r3 = useRef<THREE.Mesh>(null!);
  const dome = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const col = effect.color || '#ffaa44';

  useFrame(() => {
    const t = progress(effect);
    const e = easeOutCubic(t);
    if (r1.current) {
      r1.current.scale.setScalar(0.4 + e * 8.2);
      (r1.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.88 * (1 - t));
    }
    if (r2.current) {
      const t2 = Math.max(0, t - 0.08);
      r2.current.scale.setScalar(0.4 + easeOutCubic(t2) * 6.6);
      (r2.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 * (1 - t2));
    }
    if (r3.current) {
      const t3 = Math.max(0, t - 0.16);
      r3.current.scale.setScalar(0.4 + easeOutCubic(t3) * 5.1);
      (r3.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.35 * (1 - t3));
    }
    if (dome.current) {
      dome.current.scale.setScalar(0.5 + e * 3.3);
      (dome.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.3 * (1 - t));
    }
  });

  return (
    <group position={[target.x, target.y, target.z]}>
      <mesh ref={r1} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.3, 48]} />
        <meshBasicMaterial color={col} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={r2} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.36, 48]} />
        <meshBasicMaterial color={col} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={r3} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.42, 48]} />
        <meshBasicMaterial color="#ffffff" transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <mesh ref={dome} position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.58, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={col} transparent side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
      <pointLight color={col} intensity={7.5} distance={7.5} decay={2} />
      <Sparkles count={22} scale={2.3} size={3.6} speed={2.5} color={col} position={[0, 0.45, 0]} />
    </group>
  );
}

// ── Layer ────────────────────────────────────────────────────────────────────
interface CombatEffectsLayerProps {
  effects: CombatEffectData[];
}

export function CombatEffectsLayer({ effects }: CombatEffectsLayerProps) {
  return (
    <>
      {effects.map((effect) => {
        const key = effect.id;
        switch (effect.type) {
          case 'fire_projectile':
          case 'dark_projectile':
          case 'ice_projectile':
            return <Projectile key={key} effect={effect} />;
          case 'arrow':
            return <Arrow key={key} effect={effect} />;
          case 'physical_slash':
            return <PhysicalSlash key={key} effect={effect} />;
          case 'impact_flash':
            return <ImpactFlash key={key} effect={effect} />;
          case 'aoe_ring':
            return <AoeRing key={key} effect={effect} />;
          case 'heal_burst':
            return <HealBurst key={key} effect={effect} />;
          case 'ultimate_nova':
            return <UltimateNova key={key} effect={effect} />;
          case 'status_stun':
          case 'status_poison':
          case 'status_freeze':
            return <StatusBurst key={key} effect={effect} />;
          case 'magic_beam':
            return <MagicBeam key={key} effect={effect} />;
          case 'crit_burst':
            return <CritBurst key={key} effect={effect} />;
          case 'fire_explosion':
            return <FireExplosion key={key} effect={effect} />;
          case 'ice_shatter':
            return <IceShatter key={key} effect={effect} />;
          case 'dark_void':
            return <DarkVoid key={key} effect={effect} />;
          case 'lightning_arc':
            return <LightningArc key={key} effect={effect} />;
          case 'ground_slam':
            return <GroundSlam key={key} effect={effect} />;
          case 'magic_circle':
            return <MagicCircle key={key} effect={effect} />;
          case 'nature_projectile':
            return <NatureProjectile key={key} effect={effect} />;
          case 'beast_javelin':
            return <BeastJavelin key={key} effect={effect} />;
          case 'shockwave':
            return <Shockwave key={key} effect={effect} />;
          case 'energy_charge':
            return <EnergyCharge key={key} effect={effect} />;
          case 'heal_ring':
            return <HealRing key={key} effect={effect} />;
          case 'buff_aura':
            return <BuffAura key={key} effect={effect} />;
          default:
            return null;
        }
      })}
    </>
  );
}
