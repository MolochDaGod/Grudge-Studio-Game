import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { inspectSkeleton, printSkeletonTree, type BoneInfo } from '@/lib/skeleton-inspector';

interface SkeletonDebugOverlayProps {
  /** The root Object3D of the character scene to inspect */
  scene: THREE.Object3D;
  /** AnimationClips available on this model */
  animations?: THREE.AnimationClip[];
  /** Whether the overlay is currently visible */
  visible: boolean;
  /** World position offset for the overlay */
  offset?: [number, number, number];
}

type LiveBone = {
  name: string;
  ref: THREE.Object3D;
};

export function SkeletonDebugOverlay({
  scene,
  animations,
  visible,
  offset = [0, 0, 0],
}: SkeletonDebugOverlayProps) {
  const [reported, setReported] = useState(false);
  const groupRef = useRef<THREE.Group>(null!);

  // Inspect skeleton once and log to console for devs
  const report = useMemo(() => {
    const r = inspectSkeleton(scene, animations);
    return r;
  }, [scene, animations]);

  useEffect(() => {
    if (visible && !reported && report.bones.length > 0) {
      console.log('[SkeletonDebug]', printSkeletonTree(report));
      setReported(true);
    }
  }, [visible, reported, report]);

  // Collect live bone references for per-frame position updates
  const liveBones = useMemo<LiveBone[]>(() => {
    const result: LiveBone[] = [];
    scene.traverse((obj) => {
      if ((obj as THREE.Bone).isBone || obj.type === 'Bone') {
        result.push({ name: obj.name, ref: obj });
      }
    });
    return result;
  }, [scene]);

  // Per-frame bone world position updates
  const bonePositions = useRef<Map<string, THREE.Vector3>>(new Map());

  useFrame(() => {
    if (!visible) return;
    for (const lb of liveBones) {
      const wp = bonePositions.current.get(lb.name) ?? new THREE.Vector3();
      lb.ref.getWorldPosition(wp);
      bonePositions.current.set(lb.name, wp);
    }
  });

  if (!visible || liveBones.length === 0) return null;

  const typeColor = report.skeletonType === 'mixamo' ? '#00ffaa'
    : report.skeletonType === 'quaternius' ? '#ffaa00'
    : report.skeletonType === 'rpg-pack' ? '#aa88ff'
    : '#888888';

  return (
    <group ref={groupRef} position={offset}>
      {/* Header label */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.12}
        color={typeColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#000000"
      >
        {`[${report.skeletonType}] ${report.bones.length} bones | ${report.animations.length} clips`}
      </Text>

      {/* Bone spheres + labels */}
      {liveBones.map((lb) => (
        <BoneMarker key={lb.name} bone={lb} bonePositions={bonePositions} />
      ))}

      {/* Bone connection lines */}
      {report.bones.map((bone, i) => {
        if (!bone.parent) return null;
        const parentBone = liveBones.find(lb => lb.name === bone.parent);
        if (!parentBone) return null;
        return (
          <BoneLine key={`line-${i}`} from={bone.name} to={bone.parent} bonePositions={bonePositions} />
        );
      })}
    </group>
  );
}

// ── Individual bone marker ──────────────────────────────────────────────────

function BoneMarker({
  bone,
  bonePositions,
}: {
  bone: LiveBone;
  bonePositions: React.MutableRefObject<Map<string, THREE.Vector3>>;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const textRef = useRef<THREE.Object3D>(null!);

  useFrame(() => {
    const pos = bonePositions.current.get(bone.name);
    if (!pos) return;
    if (meshRef.current) meshRef.current.position.copy(pos);
    if (textRef.current) textRef.current.position.copy(pos).add(new THREE.Vector3(0, 0.08, 0));
  });

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshBasicMaterial color="#ff4444" />
      </mesh>
      <Text
        ref={textRef as any}
        fontSize={0.06}
        color="#ffcccc"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.008}
        outlineColor="#000000"
      >
        {bone.name}
      </Text>
    </>
  );
}

// ── Bone connection line ────────────────────────────────────────────────────

function BoneLine({
  from,
  to,
  bonePositions,
}: {
  from: string;
  to: string;
  bonePositions: React.MutableRefObject<Map<string, THREE.Vector3>>;
}) {
  const lineRef = useRef<THREE.Line>(null!);
  const geoRef = useRef<THREE.BufferGeometry>(null!);

  useFrame(() => {
    const pFrom = bonePositions.current.get(from);
    const pTo = bonePositions.current.get(to);
    if (!pFrom || !pTo || !geoRef.current) return;
    const positions = new Float32Array([
      pFrom.x, pFrom.y, pFrom.z,
      pTo.x, pTo.y, pTo.z,
    ]);
    geoRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geoRef.current.attributes.position.needsUpdate = true;
  });

  return (
    <line ref={lineRef as any}>
      <bufferGeometry ref={geoRef as any} />
      <lineBasicMaterial color="#ff8888" transparent opacity={0.5} />
    </line>
  );
}
