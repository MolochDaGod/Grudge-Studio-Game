/**
 * One-shot: repair corrupted JSX spacing in CombatEffects.tsx
 * and inject missing NatureProjectile / BeastJavelin / Shockwave.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(
  root,
  "artifacts/grudge-studio-game/src/components/three/CombatEffects.tsx",
);

let s = fs.readFileSync(file, "utf8");

// Tag openers with leading space
s = s.replace(
  /<\s+(mesh|group|pointLight|Sparkles|sphereGeometry|torusGeometry|ringGeometry|coneGeometry|cylinderGeometry|octahedronGeometry|circleGeometry|meshBasicMaterial|capsuleGeometry)\b/g,
  "<$1",
);
// Closing tags
s = s.replace(/<\s+\/(mesh|group)\s*>/g, "</$1>");
// attr = { -> attr={
s = s.replace(/([A-Za-z0-9_])\s*=\s*\{/g, "$1={");
// { foo } -> {foo} for simple expressions (avoid object literals with :)
s = s.replace(/\{\s+([A-Za-z0-9_$.?]+)\s+\}/g, "{$1}");
// args={ [x] } style
s = s.replace(/args=\{\s*\[/g, "args={[");
// position={ [ ... ]} with spaces after {
s = s.replace(/(position|rotation|scale|args)=\{\s*\[/g, "$1={[");
// color={ effect.color } leftovers
s = s.replace(/=\{\s+/g, "={");
s = s.replace(/\s+\}/g, "}");
// Fix ref={(el) with spaces
s = s.replace(/ref=\{\s*\(/g, "ref={(");
// Double spaces between attrs on same line
s = s.replace(/  +/g, " ");
// Restore indent-ish: lines that start with space after collapse of leading
// Don't re-indent whole file; prettier would do that.

// Expand EffectType with missing kinds
if (!s.includes("'nature_projectile'")) {
  s = s.replace(
    "| 'heal_ring' | 'buff_aura';",
    "| 'heal_ring' | 'buff_aura'\n  | 'nature_projectile' | 'beast_javelin' | 'shockwave';",
  );
}

// Inject missing components before CombatEffectsLayer if absent
const missingInject = `
// ── Nature projectile: leafy orb with spiral trail ───────────────────────────
const NATURE_TRAIL = 6;

function NatureProjectile({ effect }: EffectProps) {
  const ref = useRef<THREE.Group>(null!);
  const trailRefs = useRef<THREE.Mesh[]>([]);
  const from = useMemo(() => new THREE.Vector3(...effect.from), [effect.from[0], effect.from[1], effect.from[2]]);
  const to = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);
  const arcH = Math.max(1.2, from.distanceTo(to) * 0.22);

  useFrame(() => {
    if (!ref.current) return;
    const elapsed = (performance.now() - effect.createdAt) / effect.duration;
    const t = Math.min(1, elapsed);
    const ease = 1 - Math.pow(1 - t, 2);
    const x = THREE.MathUtils.lerp(from.x, to.x, ease);
    const z = THREE.MathUtils.lerp(from.z, to.z, ease);
    const y = THREE.MathUtils.lerp(from.y, to.y, ease) + arcH * Math.sin(t * Math.PI);
    ref.current.position.set(x, y, z);
    ref.current.rotation.y += 0.12;
    ref.current.rotation.z = Math.sin(t * Math.PI * 4) * 0.25;
    const opacity = t < 0.82 ? 1 : 1 - (t - 0.82) / 0.18;
    ref.current.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) {
        o.material.opacity = Math.max(0, opacity);
      }
    });
    for (let i = 0; i < NATURE_TRAIL; i++) {
      const mesh = trailRefs.current[i];
      if (!mesh) continue;
      const tt = Math.max(0, ease - (i + 1) * 0.06);
      mesh.position.set(
        THREE.MathUtils.lerp(from.x, to.x, tt),
        THREE.MathUtils.lerp(from.y, to.y, tt) + arcH * Math.sin(tt * Math.PI),
        THREE.MathUtils.lerp(from.z, to.z, tt),
      );
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - i / NATURE_TRAIL) * opacity * 0.5);
      mesh.scale.setScalar(Math.max(0.01, 0.9 - i * 0.12));
    }
  });

  const col = effect.color || '#44ff88';
  return (
    <>
      <group ref={ref} position={effect.from}>
        <mesh>
          <octahedronGeometry args={[0.16, 0]} />
          <meshBasicMaterial color={col} transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh scale={1.6}>
          <octahedronGeometry args={[0.16, 0]} />
          <meshBasicMaterial color={col} transparent opacity={0.25} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.03, 6, 16]} />
          <meshBasicMaterial color="#aaffcc" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <pointLight color={col} intensity={2.8} distance={3.5} decay={2} />
      </group>
      {Array.from({ length: NATURE_TRAIL }, (_, i) => (
        <mesh key={i} ref={(el) => { if (el) trailRefs.current[i] = el; }}>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshBasicMaterial color={col} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </>
  );
}

// ── Beast javelin: spear projectile with flat arc ────────────────────────────
function BeastJavelin({ effect }: EffectProps) {
  const ref = useRef<THREE.Group>(null!);
  const from = useMemo(() => new THREE.Vector3(...effect.from), [effect.from[0], effect.from[1], effect.from[2]]);
  const to = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);

  useFrame(() => {
    if (!ref.current) return;
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    const ease = t * t * (3 - 2 * t);
    const x = THREE.MathUtils.lerp(from.x, to.x, ease);
    const z = THREE.MathUtils.lerp(from.z, to.z, ease);
    const y = THREE.MathUtils.lerp(from.y, to.y, ease) + 0.9 * Math.sin(t * Math.PI);
    ref.current.position.set(x, y, z);
    const dx = to.x - from.x;
    const dy = (to.y - from.y) + 0.9 * Math.PI * Math.cos(t * Math.PI) * 0.15;
    const dz = to.z - from.z;
    ref.current.lookAt(x + dx, y + dy, z + dz);
    const opacity = t < 0.88 ? 1 : 1 - (t - 0.88) / 0.12;
    ref.current.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) {
        o.material.opacity = Math.max(0, opacity);
      }
    });
  });

  const col = effect.color || '#c8a060';
  return (
    <group ref={ref} position={effect.from}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.05, 6]} />
        <meshBasicMaterial color={col} transparent opacity={1} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.07, 0.28, 6]} />
        <meshBasicMaterial color="#e8d0a0" transparent opacity={1} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -0.45]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.18, 4]} />
        <meshBasicMaterial color="#8a6040" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <pointLight color={col} intensity={1.6} distance={2.5} decay={2} />
    </group>
  );
}

// ── Shockwave: multi-ring ground pulse ───────────────────────────────────────
function Shockwave({ effect }: EffectProps) {
  const r1 = useRef<THREE.Mesh>(null!);
  const r2 = useRef<THREE.Mesh>(null!);
  const r3 = useRef<THREE.Mesh>(null!);
  const dome = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(...effect.to), [effect.to[0], effect.to[1], effect.to[2]]);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.createdAt) / effect.duration);
    const ease = 1 - Math.pow(1 - t, 3);
    if (r1.current) {
      r1.current.scale.setScalar(0.4 + ease * 8);
      (r1.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 * (1 - t));
    }
    if (r2.current) {
      const t2 = Math.max(0, t - 0.08);
      r2.current.scale.setScalar(0.4 + (1 - Math.pow(1 - t2, 3)) * 6.5);
      (r2.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 * (1 - t2));
    }
    if (r3.current) {
      const t3 = Math.max(0, t - 0.16);
      r3.current.scale.setScalar(0.4 + (1 - Math.pow(1 - t3, 3)) * 5);
      (r3.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.35 * (1 - t3));
    }
    if (dome.current) {
      dome.current.scale.setScalar(0.5 + ease * 3.2);
      (dome.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.28 * (1 - t));
    }
  });

  const col = effect.color || '#ffaa44';
  return (
    <group position={[target.x, target.y, target.z]}>
      <mesh ref={r1} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.28, 48]} />
        <meshBasicMaterial color={col} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={r2} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.34, 48]} />
        <meshBasicMaterial color={col} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={r3} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.4, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={dome} position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={col} transparent opacity={0.25} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={col} intensity={7} distance={7} decay={2} />
      <Sparkles count={20} scale={2.2} size={3.5} speed={2.4} color={col} position={[0, 0.4, 0]} />
    </group>
  );
}

`;

if (!s.includes("function NatureProjectile")) {
  const marker = "// ── Main layer: renders all active effects";
  if (!s.includes(marker)) {
    console.error("Could not find inject marker");
    process.exit(1);
  }
  s = s.replace(marker, missingInject + "\n" + marker);
}

// Improve materials: add additive blending to projectile cores where meshBasicMaterial is plain
// Soften shared pattern for impact materials — leave structure, add blending prop where missing on hot effects
s = s.replace(
  /<meshBasicMaterial color=\{effect\.color\} transparent opacity=\{1\} \/>/g,
  "<meshBasicMaterial color={effect.color} transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} />",
);
s = s.replace(
  /<meshBasicMaterial color=\{effect\.color\} transparent opacity=\{0\.28\} \/>/g,
  "<meshBasicMaterial color={effect.color} transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} />",
);

// Bump projectile trail quality slightly
s = s.replace("const TRAIL_COUNT = 5;", "const TRAIL_COUNT = 8;");

// Write
fs.writeFileSync(file, s);
console.log("Wrote", file, "bytes", s.length);

// Sanity: missing functions should now exist
const checks = ["function NatureProjectile", "function BeastJavelin", "function Shockwave", "AdditiveBlending"];
for (const c of checks) {
  console.log(c, s.includes(c) ? "OK" : "MISSING");
}
// Remaining bad patterns
const bad = s.match(/<\s+mesh\b|ref=\s*\{|meshBasicMaterial color\s*=/g);
console.log("bad patterns left:", bad ? bad.length : 0, bad?.slice(0, 5));
