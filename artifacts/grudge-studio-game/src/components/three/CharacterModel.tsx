import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { TacticalUnit } from '@/store/use-game-store';

export type AnimState = 'idle' | 'moving' | 'attacking' | 'hurt' | 'dead';

interface CharacterModelProps {
  unit: TacticalUnit;
  position: [number, number, number];
  isSelected: boolean;
  animState: AnimState;
}

export function CharacterModel({ unit, position, isSelected, animState }: CharacterModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const startY = position[1] + 0.5; // Offset for character center
  
  const factionColor = unit.isPlayerControlled ? '#d4a017' : '#8b0000';
  const isDead = unit.hp <= 0 || animState === 'dead';

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // Position smoothing
    groupRef.current.position.lerp(
      new THREE.Vector3(position[0], startY, position[2]),
      0.1
    );

    // Animation states
    if (isDead) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -Math.PI / 2, 0.1);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, position[1] + 0.1, 0.1);
      if (materialRef.current) {
        materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, 0.3, 0.05);
        materialRef.current.transparent = true;
      }
    } else {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.2);
      
      switch (animState) {
        case 'moving':
          groupRef.current.position.y = startY + Math.sin(time * 15) * 0.15;
          groupRef.current.rotation.z = Math.sin(time * 10) * 0.1;
          break;
        case 'attacking':
          groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, position[2] - 0.5, 0.3);
          groupRef.current.rotation.x = 0.2;
          break;
        case 'hurt':
          groupRef.current.position.x = position[0] + Math.sin(time * 50) * 0.1;
          if (materialRef.current) {
            materialRef.current.emissive.setHex(0xffffff);
            materialRef.current.emissiveIntensity = 0.5;
          }
          break;
        case 'idle':
        default:
          groupRef.current.position.y = startY + Math.sin(time * 3) * 0.05;
          groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.1);
          if (materialRef.current) {
            materialRef.current.emissive.setHex(0x000000);
            materialRef.current.emissiveIntensity = 0;
          }
          break;
      }
    }
  });

  // Role-based sizing/weapons
  const isHeavy = ['Berserker', 'Warrior', 'Warlord', 'Defender', 'Forge Master'].includes(unit.role);
  const isRanged = ['Ranger', 'Archer'].includes(unit.role);
  
  const torsoRadius = isHeavy ? 0.35 : 0.25;
  const torsoHeight = 0.7;

  // HP indicator color
  const hpPercent = unit.hp / unit.maxHp;
  const hpColor = hpPercent > 0.5 ? '#00ff00' : hpPercent > 0.2 ? '#ffff00' : '#ff0000';

  return (
    <group ref={groupRef} position={[position[0], startY, position[2]]}>
      {/* Torso */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[torsoRadius, torsoRadius, torsoHeight, 16]} />
        <meshStandardMaterial ref={materialRef} color={factionColor} roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Head */}
      <mesh castShadow receiveShadow position={[0, torsoHeight / 2 + 0.2, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={factionColor} roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Weapon Proxy */}
      {isHeavy && !isDead && (
        <mesh castShadow position={[0.4, 0, 0.2]} rotation={[Math.PI / 4, 0, 0]}>
          <boxGeometry args={[0.1, 0.8, 0.2]} />
          <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
        </mesh>
      )}
      {isRanged && !isDead && (
        <mesh castShadow position={[0.3, 0, 0.2]} rotation={[0, 0, Math.PI / 8]}>
          <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
      )}
      {!isHeavy && !isRanged && !isDead && (
        <mesh castShadow position={[0.35, 0.2, 0.2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
          <meshStandardMaterial color="#4444ff" emissive="#0000ff" emissiveIntensity={0.2} />
        </mesh>
      )}

      {/* Selection Ring */}
      {isSelected && !isDead && (
        <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.55, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      )}

      {/* HP Ring */}
      {!isDead && (
        <mesh position={[0, torsoHeight / 2 + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.25, 16]} />
          <meshBasicMaterial color={hpColor} />
        </mesh>
      )}

      {/* Name Label */}
      {!isDead && (
        <Text
          position={[0, torsoHeight / 2 + 0.8, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {unit.name}
        </Text>
      )}
    </group>
  );
}
