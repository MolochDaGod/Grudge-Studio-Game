import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type EffectType =
  | 'fire_projectile' | 'dark_projectile' | 'ice_projectile' | 'arrow'
  | 'physical_slash'  | 'heal_burst'       | 'aoe_ring'       | 'ultimate_nova'
  | 'status_stun'     | 'status_poison'    | 'status_freeze'  | 'impact_flash'
  | 'magic_beam';

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

// ── Projectile: sphere flying from attacker → target in an arc ───────────────
function Projectile({ effect }: EffectProps) {
  const ref = useRef<THREE.Group>(null!);
  const trailRefs = useRef<THREE.Mesh[]>([]);
  const color = useMemo(() => new THREE.Color(effect.color), [effect.color]);

  const from = useMemo(() => new THREE.Vector3(...effect.from), []);
  const to   = useMemo(() => new THREE.Vector3(...effect.to),   []);
  const arcH = Math.max(1.5, from.distanceTo(to) * 0.18);

  useFrame(() => {
    if (!ref.current) return;
    const elapsed = (performance.now() - effect.createdAt) / effect.duration;
    const t = Math.min(1, elapsed);
    const x  = THREE.MathUtils.lerp(from.x, to.x, t);
    const z  = THREE.MathUtils.lerp(from.z, to.z, t);
    const y  = THREE.MathUtils.lerp(from.y, to.y, t) + arcH * Math.sin(t * Math.PI);
    ref.current.position.set(x, y, z);
    const opacity = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
    ref.current.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        (o.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity);
      }
    });
  });

  const isLargeProj = effect.type === 'ultimate_nova' || effect.type === 'fire_projectile';

  return (
    <group ref={ref} position={effect.from}>
      <mesh>
        <sphereGeometry args={[isLargeProj ? 0.22 : 0.14, 8, 8]} />
        <meshBasicMaterial color={effect.color} transparent opacity={1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[isLargeProj ? 0.38 : 0.24, 8, 8]} />
        <meshBasicMaterial color={effect.color} transparent opacity={0.28} />
      </mesh>
      {/* Point light glow */}
      <pointLight color={effect.color} intensity={2.5} distance={3} decay={2} />
    </group>
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

// ── Physical slash: bright arc flash at attacker position ────────────────────
function PhysicalSlash({ effect }: EffectProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const origin = useMemo(() => new THREE.Vector3(...effect.from), []);

  useFrame(() => {
    if (!ref.current) return;
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    const scale = 0.3 + t * 1.2;
    ref.current.scale.setScalar(scale);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t * 1.6);
    ref.current.rotation.z += 0.15;
  });

  return (
    <mesh ref={ref} position={[origin.x, origin.y + 0.8, origin.z]}>
      <torusGeometry args={[0.35, 0.06, 4, 8, Math.PI * 1.3]} />
      <meshBasicMaterial color={effect.color} transparent opacity={1} />
    </mesh>
  );
}

// ── Impact flash: expanding sphere at target ─────────────────────────────────
function ImpactFlash({ effect }: EffectProps) {
  const ref1 = useRef<THREE.Mesh>(null!);
  const ref2 = useRef<THREE.Mesh>(null!);
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
          default:
            return null;
        }
      })}
    </>
  );
}
