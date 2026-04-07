import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export type EffectType =
  | 'fire_projectile' | 'dark_projectile' | 'ice_projectile' | 'arrow'
  | 'physical_slash'  | 'heal_burst'       | 'aoe_ring'       | 'ultimate_nova'
  | 'status_stun'     | 'status_poison'    | 'status_freeze'  | 'impact_flash'
  | 'magic_beam' | 'crit_burst' | 'fire_explosion' | 'ice_shatter'
  | 'dark_void' | 'lightning_arc' | 'ground_slam';

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

// ── Projectile: element-aware sphere flying from attacker → target in an arc ──
const TRAIL_COUNT = 5;

function Projectile({ effect }: EffectProps) {
  const ref = useRef<THREE.Group>(null!);
  const trailRefs = useRef<THREE.Mesh[]>([]);

  const from = useMemo(() => new THREE.Vector3(...effect.from), []);
  const to   = useMemo(() => new THREE.Vector3(...effect.to),   []);
  const arcH = Math.max(1.5, from.distanceTo(to) * 0.18);

  const isFire = effect.type === 'fire_projectile';
  const isDark = effect.type === 'dark_projectile';
  const isIce = effect.type === 'ice_projectile';

  useFrame(() => {
    if (!ref.current) return;
    const elapsed = (performance.now() - effect.createdAt) / effect.duration;
    const t = Math.min(1, elapsed);
    const x = THREE.MathUtils.lerp(from.x, to.x, t);
    const z = THREE.MathUtils.lerp(from.z, to.z, t);
    const y = THREE.MathUtils.lerp(from.y, to.y, t) + arcH * Math.sin(t * Math.PI);
    ref.current.position.set(x, y, z);
    // Face direction of travel
    if (t < 0.98) {
      const dt = Math.min(1, elapsed + 0.02);
      ref.current.lookAt(
        THREE.MathUtils.lerp(from.x, to.x, dt),
        THREE.MathUtils.lerp(from.y, to.y, dt) + arcH * Math.sin(dt * Math.PI),
        THREE.MathUtils.lerp(from.z, to.z, dt),
      );
    }
    const opacity = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
    ref.current.traverse((o) => {
      if (o instanceof THREE.Mesh) (o.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity);
    });
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const mesh = trailRefs.current[i];
      if (!mesh) continue;
      const tTrail = Math.max(0, t - (i + 1) * 0.07);
      const tx = THREE.MathUtils.lerp(from.x, to.x, tTrail);
      const tz = THREE.MathUtils.lerp(from.z, to.z, tTrail);
      const ty = THREE.MathUtils.lerp(from.y, to.y, tTrail) + arcH * Math.sin(tTrail * Math.PI);
      mesh.position.set(tx, ty, tz);
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - i / TRAIL_COUNT) * opacity * 0.55);
      mesh.scale.setScalar(Math.max(0.01, 0.8 - i * 0.14));
    }
  });

  const isLarge = isFire;
  const coreR = isLarge ? 0.22 : 0.14;
  const outerR = isLarge ? 0.38 : 0.24;
  const trailR = isLarge ? 0.14 : 0.09;
  const lightI = isFire ? 3.5 : isDark ? 2.0 : 2.5;

  return (
    <>
    <group ref= { ref } position = { effect.from } >
      <mesh>
    <sphereGeometry args={ [coreR, 8, 8] } />
      < meshBasicMaterial color = { effect.color } transparent opacity = { 1} />
        </mesh>
    < mesh >
    <sphereGeometry args={ [outerR, 8, 8] } />
      < meshBasicMaterial color = { effect.color } transparent opacity = { 0.28} />
        </mesh>
  {/* Dark projectile: orbiting void ring */ }
  {
    isDark && (
      <mesh rotation={ [Math.PI / 2, 0, 0] }>
        <torusGeometry args={ [outerR * 1.3, 0.04, 6, 18] } />
          < meshBasicMaterial color = "#cc00ff" transparent opacity = { 0.65} />
            </mesh>
        )
  }
  {/* Ice projectile: crystalline forward spike */ }
  {
    isIce && (
      <mesh position={ [0, coreR + 0.12, 0] }>
        <coneGeometry args={ [0.07, 0.32, 6] } />
          < meshBasicMaterial color = "#ccefff" transparent opacity = { 0.9} />
            </mesh>
        )
  }
  {/* Fire projectile: inner ember core */ }
  {
    isFire && (
      <mesh>
      <sphereGeometry args={ [coreR * 0.55, 6, 6] } />
        < meshBasicMaterial color = "#ffffff" transparent opacity = { 0.7} />
          </mesh>
        )
  }
  <pointLight color={ effect.color } intensity = { lightI } distance = { 3} decay = { 2} />
    </group>
  {
    Array.from({ length: TRAIL_COUNT }, (_, i) => (
      <mesh key= { i } ref = {(el) => { if(el) trailRefs.current[i] = el; }}>
        <sphereGeometry args={ [trailR, 5, 5] } />
          < meshBasicMaterial color = { effect.color } transparent opacity = { 0} />
            </mesh>
      ))
}
</>
  );
}

// ── Arrow: thin capsule flying flat arc ──────────────────────────────────────
function Arrow({ effect }: EffectProps) {
  const ref = useRef<THREE.Group>(null!);
  const from = useMemo(() => new THREE.Vector3(...effect.from), []);
  const to   = useMemo(() => new THREE.Vector3(...effect.to),   []);

  useFrame(() => {
    if (!ref.current) return;
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    const x = THREE.MathUtils.lerp(from.x, to.x, t);
    const z = THREE.MathUtils.lerp(from.z, to.z, t);
    const y = THREE.MathUtils.lerp(from.y, to.y, t) + 0.8 * Math.sin(t * Math.PI);
    ref.current.position.set(x, y, z);

    const dx = to.x - from.x;
    const dz = to.z - from.z;
    ref.current.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2;

    const opacity = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
    ref.current.traverse((o) => {
      if (o instanceof THREE.Mesh) (o.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity);
    });
  });

  return (
    <group ref={ref} position={effect.from}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.9, 4]} />
        <meshBasicMaterial color="#c8a050" transparent opacity={1} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.2, 4]} />
        <meshBasicMaterial color="#e8c070" transparent opacity={1} />
      </mesh>
    </group>
  );
}

// ── Physical slash: triple arc fan + spark burst at attacker position ────────
const SLASH_SPARK_COUNT = 6;

function PhysicalSlash({ effect }: EffectProps) {
  const arc1Ref = useRef<THREE.Mesh>(null!);
  const arc2Ref = useRef<THREE.Mesh>(null!);
  const arc3Ref = useRef<THREE.Mesh>(null!);
  const sparkRefs = useRef<THREE.Mesh[]>([]);
  const origin = useMemo(() => new THREE.Vector3(...effect.from), []);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);

    // Arc 1 — leads
    if (arc1Ref.current) {
      arc1Ref.current.scale.setScalar(0.2 + t * 1.5);
      (arc1Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 - t * 1.4);
      arc1Ref.current.rotation.z += 0.13;
    }
    // Arc 2 — slight delay
    const t2 = Math.max(0, t - 0.12);
    if (arc2Ref.current) {
      arc2Ref.current.scale.setScalar(0.15 + t2 * 1.35);
      (arc2Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 - t2 * 1.3);
      arc2Ref.current.rotation.z += 0.11;
    }
    // Arc 3 — more delay
    const t3 = Math.max(0, t - 0.24);
    if (arc3Ref.current) {
      arc3Ref.current.scale.setScalar(0.1 + t3 * 1.2);
      (arc3Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 - t3 * 1.2);
      arc3Ref.current.rotation.z += 0.09;
    }
    // Sparks fly outward
    sparkRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / SLASH_SPARK_COUNT) * Math.PI * 2;
      const r = t * 1.3;
      mesh.position.set(
        origin.x + Math.cos(angle) * r,
        origin.y + 0.9 + t * 0.4,
        origin.z + Math.sin(angle) * r,
      );
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - t * 1.2);
      mesh.scale.setScalar(Math.max(0.01, 0.13 - t * 0.13));
    });
  });

  return (
    <>
    <mesh ref= { arc1Ref } position = { [origin.x, origin.y + 0.8, origin.z]} >
      <torusGeometry args={ [0.30, 0.056, 4, 8, Math.PI * 1.4] } />
        < meshBasicMaterial color = { effect.color } transparent opacity = { 0.95} />
          </mesh>
          < mesh ref = { arc2Ref } position = { [origin.x, origin.y + 0.95, origin.z]} rotation = { [0, 0, Math.PI * 0.4]} >
            <torusGeometry args={ [0.42, 0.048, 4, 8, Math.PI * 1.3] } />
              < meshBasicMaterial color = { effect.color } transparent opacity = { 0.75} />
                </mesh>
                < mesh ref = { arc3Ref } position = { [origin.x, origin.y + 1.1, origin.z]} rotation = { [0, 0, Math.PI * 0.8]} >
                  <torusGeometry args={ [0.54, 0.038, 4, 8, Math.PI * 1.2] } />
                    < meshBasicMaterial color = { effect.color } transparent opacity = { 0.55} />
                      </mesh>
  {
    Array.from({ length: SLASH_SPARK_COUNT }, (_, i) => (
      <mesh key= { i } ref = {(el) => { if(el) sparkRefs.current[i] = el; }}
  position = { [origin.x, origin.y + 0.9, origin.z]} >
    <sphereGeometry args={ [0.06, 4, 4] } />
      < meshBasicMaterial color = { effect.color } transparent opacity = { 0.9} />
        </mesh>
      ))
}
</>
  );
}

// ── Impact flash: expanding sphere + ring burst at target ────────────────────
function ImpactFlash({ effect }: EffectProps) {
  const ref1 = useRef<THREE.Mesh>(null!);
  const ref2 = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), []);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    if (ref1.current) {
      ref1.current.scale.setScalar(1 + t * 2.5);
      (ref1.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - t * 1.1);
    }
    if (ref2.current) {
      ref2.current.scale.setScalar(1 + t * 4);
      (ref2.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 - t * 0.8);
    }
    // Expanding ground ring burst
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + t * 5);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 - t * 1.1);
    }
    if (ring2Ref.current) {
      ring2Ref.current.scale.setScalar(1 + t * 8);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.4 - t * 0.7);
    }
  });

  return (
    <group position={[target.x, target.y + 0.5, target.z]}>
      <mesh ref={ref1}>
        <sphereGeometry args={[0.28, 8, 8]} />
        <meshBasicMaterial color={effect.color} transparent opacity={0.9} />
      </mesh>
      <mesh ref={ref2}>
        <sphereGeometry args={[0.35, 6, 6]} />
        <meshBasicMaterial color={effect.color} transparent opacity={0.4} />
      </mesh>
  {/* Ground ring burst */ }
  <mesh ref={ ringRef } position = { [0, -0.45, 0]} rotation = { [-Math.PI / 2, 0, 0]} >
    <ringGeometry args={ [0.15, 0.32, 32] } />
      < meshBasicMaterial color = { effect.color } transparent opacity = { 0.75} side = { THREE.DoubleSide } />
        </mesh>
        < mesh ref = { ring2Ref } position = { [0, -0.44, 0]} rotation = { [-Math.PI / 2, 0, 0]} >
          <ringGeometry args={ [0.22, 0.36, 32] } />
            < meshBasicMaterial color = { effect.color } transparent opacity = { 0.35} side = { THREE.DoubleSide } />
              </mesh>
      <pointLight color={effect.color} intensity={4} distance={5} decay={2} />
    </group>
  );
}

// ── AoE ring: flat torus expanding outward ───────────────────────────────────
function AoeRing({ effect }: EffectProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), []);

  useFrame(() => {
    if (!ref.current) return;
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    ref.current.scale.setScalar(1 + t * 3.5);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - t * 0.85);
  });

  return (
    <mesh ref={ref} position={[target.x, 0.08, target.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.6, 0.92, 32]} />
      <meshBasicMaterial color={effect.color} transparent opacity={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Heal burst: rising green sparks at caster ────────────────────────────────
function HealBurst({ effect }: EffectProps) {
  const refs = useRef<THREE.Mesh[]>([]);
  const target = useMemo(() => new THREE.Vector3(...effect.to), []);
  const COUNT = 8;
  const angles = useMemo(() => Array.from({ length: COUNT }, (_, i) => (i / COUNT) * Math.PI * 2), []);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = angles[i];
      const r = 0.35 + t * 0.5;
      mesh.position.set(
        target.x + Math.cos(angle) * r,
        target.y + 0.3 + t * 1.5,
        target.z + Math.sin(angle) * r,
      );
      mesh.scale.setScalar(Math.max(0.05, 1 - t));
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t * 1.2);
    });
  });

  return (
    <>
      {angles.map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) refs.current[i] = el; }} position={[target.x, target.y, target.z]}>
          <sphereGeometry args={[0.07, 4, 4]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={1} />
        </mesh>
      ))}
      <mesh position={[target.x, target.y + 0.3, target.z]}>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.15} />
      </mesh>
      {/* Rising sparkles for heal effect */}
      <Sparkles
        count={18}
        scale={1.5}
        size={3}
        speed={1.8}
        color="#00ff88"
        position={[target.x, target.y + 0.5, target.z]}
      />
    </>
  );
}

// ── Ultimate nova: massive expanding sphere + ring ────────────────────────────
function UltimateNova({ effect }: EffectProps) {
  const sphereRef = useRef<THREE.Mesh>(null!);
  const ring1Ref  = useRef<THREE.Mesh>(null!);
  const ring2Ref  = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), []);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    if (sphereRef.current) {
      sphereRef.current.scale.setScalar(1 + t * 5);
      (sphereRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.6 - t * 0.7);
    }
    if (ring1Ref.current) {
      ring1Ref.current.scale.setScalar(1 + t * 6);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - t);
    }
    if (ring2Ref.current) {
      ring2Ref.current.scale.setScalar(1 + t * 9);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.5 - t * 0.7);
    }
  });

  return (
    <group position={[target.x, target.y, target.z]}>
      <mesh ref={sphereRef} position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.5, 10, 10]} />
        <meshBasicMaterial color={effect.color} transparent opacity={0.6} />
      </mesh>
      <mesh ref={ring1Ref} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.9, 32]} />
        <meshBasicMaterial color={effect.color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2Ref} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.75, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={effect.color} intensity={8} distance={10} decay={1.5} />
    </group>
  );
}

// ── Magic beam: sustained laser/beam from caster → target ─────────────────────
function MagicBeam({ effect }: EffectProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const beamRef  = useRef<THREE.Mesh>(null!);
  const glowRef  = useRef<THREE.Mesh>(null!);
  const color = useMemo(() => new THREE.Color(effect.color), [effect.color]);

  const from = useMemo(() => new THREE.Vector3(...effect.from), []);
  const to   = useMemo(() => new THREE.Vector3(...effect.to),   []);
  const mid  = useMemo(() => from.clone().lerp(to, 0.5), [from, to]);
  const dist = useMemo(() => from.distanceTo(to), [from, to]);
  const dir  = useMemo(() => to.clone().sub(from).normalize(), [from, to]);

  // Compute rotation so the cylinder stretches from → to
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [dir]);

  useFrame(() => {
    if (!groupRef.current) return;
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    const opacity = t < 0.7 ? 0.85 : 0.85 * (1 - (t - 0.7) / 0.3);
    const pulse = 1 + 0.15 * Math.sin(t * Math.PI * 8);
    if (beamRef.current) {
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity);
      beamRef.current.scale.set(pulse, 1, pulse);
    }
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity * 0.35);
      glowRef.current.scale.set(pulse * 1.6, 1, pulse * 1.6);
    }
  });

  return (
    <group ref={groupRef} position={[mid.x, mid.y + 0.8, mid.z]} quaternion={quaternion}>
      {/* Core beam */}
      <mesh ref={beamRef}>
        <cylinderGeometry args={[0.06, 0.06, dist, 6]} />
        <meshBasicMaterial color={effect.color} transparent opacity={0.85} />
      </mesh>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <cylinderGeometry args={[0.16, 0.16, dist, 6]} />
        <meshBasicMaterial color={effect.color} transparent opacity={0.3} />
      </mesh>
      {/* Impact point light */}
      <pointLight color={effect.color} intensity={4} distance={5} decay={2}
        position={[0, dist / 2, 0]} />
    </group>
  );
}

// ── Status effect burst ───────────────────────────────────────────────────────
function StatusBurst({ effect }: EffectProps) {
  const refs = useRef<THREE.Mesh[]>([]);
  const target = useMemo(() => new THREE.Vector3(...effect.to), []);
  const COUNT = 6;
  const angles = useMemo(() => Array.from({ length: COUNT }, (_, i) => (i / COUNT) * Math.PI * 2), []);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = angles[i];
      const r = 0.5 + t * 0.8;
      mesh.position.set(
        target.x + Math.cos(angle) * r,
        target.y + 0.5 + t * 0.4,
        target.z + Math.sin(angle) * r,
      );
      const s = Math.max(0.05, 1 - t * 1.1);
      mesh.scale.setScalar(s * 0.15);
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t * 1.2);
    });
  });

  return (
    <>
      {angles.map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) refs.current[i] = el; }}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={effect.color} transparent opacity={1} />
        </mesh>
      ))}
    </>
  );
}

// ── Crit burst: radial multi-slash explosion on critical hit ─────────────────
const CRIT_SLASH_COUNT = 5;

function CritBurst({ effect }: EffectProps) {
  const slashRefs = useRef<THREE.Mesh[]>([]);
  const ringRef = useRef<THREE.Mesh>(null!);
  const innerRef = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), []);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    slashRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.scale.setScalar(0.1 + t * 1.9);
      mesh.rotation.z = (i / CRIT_SLASH_COUNT) * Math.PI * 2 + t * 0.6;
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 - t * 1.1);
    });
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + t * 4.5);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - t);
    }
    if (innerRef.current) {
      innerRef.current.scale.setScalar(1 + t * 2.2);
      (innerRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.65 - t * 0.9);
    }
  });

  return (
    <group position= { [target.x, target.y + 0.5, target.z]} >
    {
      Array.from({ length: CRIT_SLASH_COUNT }, (_, i) => (
        <mesh key= { i } ref = {(el) => { if(el) slashRefs.current[i] = el; }}
  rotation = { [0, 0, (i / CRIT_SLASH_COUNT) * Math.PI * 2]} >
    <torusGeometry args={ [0.4, 0.052, 4, 8, Math.PI * 0.7] } />
      < meshBasicMaterial color = { effect.color } transparent opacity = { 0.95} />
        </mesh>
      ))
}
<mesh ref={ ringRef } position = { [0, -0.45, 0]} rotation = { [-Math.PI / 2, 0, 0]} >
  <ringGeometry args={ [0.1, 0.26, 32] } />
    < meshBasicMaterial color = { effect.color } transparent opacity = { 0.85} side = { THREE.DoubleSide } />
      </mesh>
      < mesh ref = { innerRef } >
        <sphereGeometry args={ [0.28, 8, 8] } />
          < meshBasicMaterial color = "#ffffff" transparent opacity = { 0.65} />
            </mesh>
            < pointLight color = { effect.color } intensity = { 7} distance = { 6} decay = { 2} />
              <Sparkles count={ 22 } scale = { 1.8} size = { 4} speed = { 2.2} color = { effect.color } />
                </group>
  );
}

// ── Fire explosion: expanding layered burst at impact ─────────────────────────
function FireExplosion({ effect }: EffectProps) {
  const coreRef = useRef<THREE.Mesh>(null!);
  const outerRef = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), []);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    if (coreRef.current) {
      coreRef.current.scale.setScalar(1 + t * 3.2);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - t);
    }
    if (outerRef.current) {
      outerRef.current.scale.setScalar(1 + t * 5.5);
      (outerRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.45 - t * 0.6);
    }
    if (ring1Ref.current) {
      ring1Ref.current.scale.setScalar(1 + t * 6.5);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - t);
    }
    if (ring2Ref.current) {
      ring2Ref.current.scale.setScalar(1 + t * 10);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.35 - t * 0.55);
    }
  });

  return (
    <group position= { [target.x, target.y + 0.5, target.z]} >
    <mesh ref={ coreRef }>
      <sphereGeometry args={ [0.4, 10, 10] } />
        < meshBasicMaterial color = "#ff8800" transparent opacity = { 0.9} />
          </mesh>
          < mesh ref = { outerRef } >
            <sphereGeometry args={ [0.55, 8, 8] } />
              < meshBasicMaterial color = "#ff4400" transparent opacity = { 0.4} />
                </mesh>
                < mesh ref = { ring1Ref } position = { [0, -0.45, 0]} rotation = { [-Math.PI / 2, 0, 0]} >
                  <ringGeometry args={ [0.3, 0.55, 32] } />
                    < meshBasicMaterial color = "#ff6600" transparent opacity = { 0.8} side = { THREE.DoubleSide } />
                      </mesh>
                      < mesh ref = { ring2Ref } position = { [0, -0.44, 0]} rotation = { [-Math.PI / 2, 0, 0]} >
                        <ringGeometry args={ [0.4, 0.6, 32] } />
                          < meshBasicMaterial color = "#ffaa00" transparent opacity = { 0.3} side = { THREE.DoubleSide } />
                            </mesh>
                            < pointLight color = "#ff6600" intensity = { 9} distance = { 8} decay = { 1.5} />
                              <Sparkles count={ 28 } scale = { 2.4} size = { 4} speed = { 2.8} color = "#ff9900" />
                                </group>
  );
}

// ── Ice shatter: crystal spikes converging on target ─────────────────────────
const ICE_SPIKE_COUNT = 6;

function IceShatter({ effect }: EffectProps) {
  const spikeRefs = useRef<THREE.Mesh[]>([]);
  const shardRefs = useRef<THREE.Mesh[]>([]);
  const ringRef = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), []);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    // Spikes fly inward then explode outward
    const phase = t < 0.5 ? t * 2 : 1; // 0→1 in first half
    const burst = t > 0.5 ? (t - 0.5) * 2 : 0; // 0→1 in second half
    spikeRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / ICE_SPIKE_COUNT) * Math.PI * 2;
      const r = (1 - phase) * 1.8 + burst * 2.2;
      mesh.position.set(
        target.x + Math.cos(angle) * r,
        target.y + 0.6 + (1 - phase) * 0.3,
        target.z + Math.sin(angle) * r,
      );
      mesh.rotation.y = angle + Math.PI;
      mesh.rotation.x = -Math.PI / 4 + burst * 0.8;
      mesh.scale.setScalar(Math.max(0.01, 1 - burst * 1.2));
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - burst * 1.1);
    });
    // Shards scatter on impact
    shardRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / 8) * Math.PI * 2 + 0.4;
      const r = burst * 1.6;
      mesh.position.set(
        target.x + Math.cos(angle) * r,
        target.y + 0.4 + burst * 1.2,
        target.z + Math.sin(angle) * r,
      );
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, burst > 0.1 ? 0.8 - burst * 0.9 : 0);
      mesh.scale.setScalar(Math.max(0.01, 0.15 - burst * 0.14));
    });
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + burst * 5);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - burst * 0.9);
    }
  });

  return (
    <>
    {
      Array.from({ length: ICE_SPIKE_COUNT }, (_, i) => (
        <mesh key= { i } ref = {(el) => { if(el) spikeRefs.current[i] = el; }}
          position = { [target.x, target.y + 0.6, target.z]} >
    <coneGeometry args={ [0.08, 0.55, 6] } />
      < meshBasicMaterial color = { effect.color } transparent opacity = { 0.9} />
        </mesh>
      ))
}
{
  Array.from({ length: 8 }, (_, i) => (
    <mesh key= {`s${i}`} ref = {(el) => { if (el) shardRefs.current[i] = el; }}
position = { [target.x, target.y + 0.4, target.z]} >
  <octahedronGeometry args={ [0.09] } />
    < meshBasicMaterial color = "#eafaff" transparent opacity = { 0} />
      </mesh>
      ))}
<mesh ref={ ringRef } position = { [target.x, target.y + 0.05, target.z]} rotation = { [-Math.PI / 2, 0, 0]} >
  <ringGeometry args={ [0.08, 0.2, 32] } />
    < meshBasicMaterial color = { effect.color } transparent opacity = { 0.7} side = { THREE.DoubleSide } />
      </mesh>
      < pointLight color = { effect.color } intensity = { 6} distance = { 5} decay = { 2} />
        <Sparkles count={ 18 } scale = { 1.5} size = { 3} speed = { 1.6} color = "#ccefff" />
          </>
  );
}

// ── Dark void: swirling vortex rings at target ────────────────────────────────
const VOID_RING_COUNT = 4;

function DarkVoid({ effect }: EffectProps) {
  const ringRefs = useRef<THREE.Mesh[]>([]);
  const coreRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), []);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    ringRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const delay = i * 0.12;
      const tR = Math.max(0, t - delay);
      mesh.scale.setScalar(0.5 + tR * 3.5);
      mesh.rotation.z += 0.06 + i * 0.03;
      mesh.rotation.x = (Math.PI / 2) * (1 - tR * 0.4);
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 - tR * 0.85);
    });
    if (coreRef.current) {
      coreRef.current.scale.setScalar(0.3 + t * 1.8);
      coreRef.current.rotation.y += 0.08;
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - t * 0.9);
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(0.8 + t * 2.5);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.35 - t * 0.45);
    }
  });

  return (
    <group position= { [target.x, target.y + 0.5, target.z]} >
    {
      Array.from({ length: VOID_RING_COUNT }, (_, i) => (
        <mesh key= { i } ref = {(el) => { if(el) ringRefs.current[i] = el; }}
  rotation = { [Math.PI / 2, 0, (i / VOID_RING_COUNT) * Math.PI]} >
    <torusGeometry args={ [0.38 + i * 0.12, 0.04, 8, 32] } />
      < meshBasicMaterial color = { effect.color } transparent opacity = { 0.75} />
        </mesh>
      ))
}
<mesh ref={ coreRef }>
  <sphereGeometry args={ [0.22, 10, 10] } />
    < meshBasicMaterial color = "#cc00ff" transparent opacity = { 0.85} />
      </mesh>
      < mesh ref = { glowRef } >
        <sphereGeometry args={ [0.42, 8, 8] } />
          < meshBasicMaterial color = { effect.color } transparent opacity = { 0.3} />
            </mesh>
            < pointLight color = "#aa00ff" intensity = { 8} distance = { 7} decay = { 1.5} />
              <Sparkles count={ 20 } scale = { 2} size = { 3.5} speed = { 2} color = "#cc00ff" />
                </group>
  );
}

// ── Lightning arc: flickering bolt beam from attacker to target ───────────────
const LIGHTNING_SEGMENT_COUNT = 8;

function LightningArc({ effect }: EffectProps) {
  const segRefs = useRef<THREE.Mesh[]>([]);
  const flashRef = useRef<THREE.Mesh>(null!);
  const from = useMemo(() => new THREE.Vector3(...effect.from), []);
  const to = useMemo(() => new THREE.Vector3(...effect.to), []);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    const flicker = Math.sin(performance.now() * 0.04) * 0.5 + 0.5; // 0–1 fast flicker
    const opacity = Math.max(0, (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3) * (0.5 + flicker * 0.5));

    segRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const pct = i / (LIGHTNING_SEGMENT_COUNT - 1);
      const jitter = (1 - t) * 0.35 * (Math.random() - 0.5);
      mesh.position.set(
        THREE.MathUtils.lerp(from.x, to.x, pct) + jitter,
        THREE.MathUtils.lerp(from.y + 0.9, to.y + 0.9, pct) + jitter,
        THREE.MathUtils.lerp(from.z, to.z, pct) + jitter,
      );
      mesh.scale.setScalar(Math.max(0.01, 0.18 + flicker * 0.12));
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    });
    if (flashRef.current) {
      flashRef.current.position.set(to.x, to.y + 0.7, to.z);
      flashRef.current.scale.setScalar(Math.max(0.01, (0.4 + flicker * 0.6) * (1 - t)));
      (flashRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity * 0.8);
    }
  });

  return (
    <>
    {
      Array.from({ length: LIGHTNING_SEGMENT_COUNT }, (_, i) => (
        <mesh key= { i } ref = {(el) => { if(el) segRefs.current[i] = el; }} >
    <sphereGeometry args= { [0.12, 5, 5]} />
    <meshBasicMaterial color={ effect.color } transparent opacity = { 1} />
      </mesh>
      ))
}
<mesh ref={ flashRef } position = { [to.x, to.y + 0.7, to.z]} >
  <sphereGeometry args={ [0.35, 8, 8] } />
    < meshBasicMaterial color = "#ffffff" transparent opacity = { 0.8} />
      </mesh>
      < pointLight color = { effect.color } intensity = { 6} distance = { 6} decay = { 2}
position = { [THREE.MathUtils.lerp(from.x, to.x, 0.5), THREE.MathUtils.lerp(from.y, to.y, 0.5) + 0.9, THREE.MathUtils.lerp(from.z, to.z, 0.5)]} />
  <Sparkles count={ 14 } scale = { 1.4} size = { 3} speed = { 3} color = { effect.color } />
    </>
  );
}

// ── Ground slam: expanding shockwave rings + debris spikes ────────────────────
const DEBRIS_COUNT = 7;

function GroundSlam({ effect }: EffectProps) {
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const ring3Ref = useRef<THREE.Mesh>(null!);
  const debrisRefs = useRef<THREE.Mesh[]>([]);
  const dustRef = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), []);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    if (ring1Ref.current) {
      ring1Ref.current.scale.setScalar(1 + t * 7);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - t);
    }
    const t2 = Math.max(0, t - 0.1);
    if (ring2Ref.current) {
      ring2Ref.current.scale.setScalar(1 + t2 * 5.5);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.65 - t2 * 0.9);
    }
    const t3 = Math.max(0, t - 0.2);
    if (ring3Ref.current) {
      ring3Ref.current.scale.setScalar(1 + t3 * 4);
      (ring3Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.45 - t3 * 0.7);
    }
    debrisRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / DEBRIS_COUNT) * Math.PI * 2;
      const r = t * 1.6;
      const rise = Math.max(0, (t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6));
      mesh.position.set(
        target.x + Math.cos(angle) * r,
        target.y + rise * 1.2,
        target.z + Math.sin(angle) * r,
      );
      mesh.scale.setScalar(Math.max(0.01, 0.18 - t * 0.15));
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - t * 0.9);
    });
    if (dustRef.current) {
      dustRef.current.scale.setScalar(1 + t * 3.2);
      (dustRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.3 - t * 0.4);
    }
  });

  return (
    <>
    <mesh ref= { ring1Ref } position = { [target.x, target.y + 0.05, target.z]} rotation = { [-Math.PI / 2, 0, 0]} >
      <ringGeometry args={ [0.1, 0.22, 40] } />
        < meshBasicMaterial color = { effect.color } transparent opacity = { 0.9} side = { THREE.DoubleSide } />
          </mesh>
          < mesh ref = { ring2Ref } position = { [target.x, target.y + 0.06, target.z]} rotation = { [-Math.PI / 2, 0, 0]} >
            <ringGeometry args={ [0.15, 0.28, 40] } />
              < meshBasicMaterial color = { effect.color } transparent opacity = { 0.6} side = { THREE.DoubleSide } />
                </mesh>
                < mesh ref = { ring3Ref } position = { [target.x, target.y + 0.07, target.z]} rotation = { [-Math.PI / 2, 0, 0]} >
                  <ringGeometry args={ [0.2, 0.35, 40] } />
                    < meshBasicMaterial color = { effect.color } transparent opacity = { 0.4} side = { THREE.DoubleSide } />
                      </mesh>
  {
    Array.from({ length: DEBRIS_COUNT }, (_, i) => (
      <mesh key= { i } ref = {(el) => { if(el) debrisRefs.current[i] = el; }}
  position = { [target.x, target.y, target.z]} >
    <coneGeometry args={ [0.06, 0.22, 5] } />
      < meshBasicMaterial color = { effect.color } transparent opacity = { 0.85} />
        </mesh>
      ))
}
<mesh ref={ dustRef } position = { [target.x, target.y + 0.1, target.z]} >
  <sphereGeometry args={ [0.5, 8, 8] } />
    < meshBasicMaterial color = { effect.color } transparent opacity = { 0.25} />
      </mesh>
      < pointLight color = { effect.color } intensity = { 8} distance = { 6} decay = { 2} />
        </>
  );
}

// ── Main layer: renders all active effects ────────────────────────────────────
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
            return <CritBurst key={ key } effect = { effect } />;
          case 'fire_explosion':
            return <FireExplosion key={ key } effect = { effect } />;
          case 'ice_shatter':
            return <IceShatter key={ key } effect = { effect } />;
          case 'dark_void':
            return <DarkVoid key={ key } effect = { effect } />;
          case 'lightning_arc':
            return <LightningArc key={ key } effect = { effect } />;
          case 'ground_slam':
            return <GroundSlam key={ key } effect = { effect } />;
          default:
            return null;
        }
      })}
    </>
  );
}
