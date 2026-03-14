import React, { Suspense, useMemo } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { PropPlacement } from '@/lib/levels';

const BASE = import.meta.env.BASE_URL;

function getPackAtlas(modelUrl: string): string | null {
  if (modelUrl.includes('/maps/medieval/')) return `${BASE}models/maps/medieval/atlas.png`;
  if (modelUrl.includes('/maps/elven/'))    return `${BASE}models/maps/elven/atlas.png`;
  if (modelUrl.includes('/maps/orc/'))      return `${BASE}models/maps/orc/atlas.png`;
  if (modelUrl.includes('/maps/ruins/'))    return `${BASE}models/maps/ruins/atlas.png`;
  return null;
}

interface PropModelRawProps {
  placement: PropPlacement;
  atlas: THREE.Texture | null;
}

function PropModelRaw({ placement, atlas }: PropModelRawProps) {
  const { scene: rawScene } = useGLTF(placement.modelUrl);

  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(rawScene);
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const std = new THREE.MeshStandardMaterial({
          map: atlas ?? null,
          color: atlas ? 0xffffff : 0xa0a096,
          roughness: 0.78,
          metalness: 0.08,
        });
        obj.material = std;
      }
    });
    return clone;
  }, [rawScene, atlas]);

  return (
    <group position={[placement.x, 0, placement.z]} rotation={[0, placement.rotY, 0]}>
      <primitive
        object={clonedScene}
        scale={[placement.scale, placement.scale, placement.scale]}
      />
    </group>
  );
}

function PropModelWithAtlas({ placement, atlasUrl }: { placement: PropPlacement; atlasUrl: string }) {
  const atlas = useTexture(atlasUrl);
  atlas.flipY = false;
  atlas.colorSpace = THREE.SRGBColorSpace;
  return <PropModelRaw placement={placement} atlas={atlas} />;
}

function PropModelNoAtlas({ placement }: { placement: PropPlacement }) {
  return <PropModelRaw placement={placement} atlas={null} />;
}

function PropModel({ placement }: { placement: PropPlacement }) {
  const atlasUrl = getPackAtlas(placement.modelUrl);
  if (atlasUrl) {
    return <PropModelWithAtlas placement={placement} atlasUrl={atlasUrl} />;
  }
  return <PropModelNoAtlas placement={placement} />;
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

export function preloadLevelProps(props: PropPlacement[]) {
  const urls = [...new Set(props.map(p => p.modelUrl))];
  urls.forEach(url => useGLTF.preload(url));
}
