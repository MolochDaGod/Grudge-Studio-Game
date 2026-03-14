import React, { Suspense, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { PropPlacement } from '@/lib/levels';

interface PropModelProps {
  placement: PropPlacement;
}

function PropModel({ placement }: PropModelProps) {
  const { scene: rawScene } = useGLTF(placement.modelUrl);
  const clonedScene = React.useMemo(() => {
    const clone = SkeletonUtils.clone(rawScene);
    // Apply vertex colors + improve materials for untextured FBX-converted models
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        const results = mats.map((m) => {
          if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhongMaterial) {
            const std = new THREE.MeshStandardMaterial({
              color: (m as any).color ?? new THREE.Color(0x888888),
              roughness: 0.8,
              metalness: 0.1,
            });
            return std;
          }
          const fb = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, metalness: 0.1 });
          return fb;
        });
        obj.material = Array.isArray(obj.material) ? results : results[0];
      }
    });
    return clone;
  }, [rawScene]);

  return (
    <group position={[placement.x, 0, placement.z]} rotation={[0, placement.rotY, 0]}>
      <primitive object={clonedScene} scale={[placement.scale, placement.scale, placement.scale]} />
    </group>
  );
}

interface ScenePropLayerProps {
  props: PropPlacement[];
}

export function ScenePropLayer({ props }: ScenePropLayerProps) {
  return (
    <group>
      {props.map((p, i) => (
        <Suspense key={`prop_${i}_${p.modelUrl}`} fallback={null}>
          <PropModel placement={p} />
        </Suspense>
      ))}
    </group>
  );
}

// Preload all prop models when the level loads
export function preloadLevelProps(props: PropPlacement[]) {
  const urls = [...new Set(props.map(p => p.modelUrl))];
  urls.forEach(url => useGLTF.preload(url));
}
