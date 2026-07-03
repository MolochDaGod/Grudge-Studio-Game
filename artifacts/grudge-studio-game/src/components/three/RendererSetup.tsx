import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { applyKtx2ToDrei } from '@/lib/compressed-loaders';

/**
 * One-time WebGL renderer tuning — ACES tone mapping, soft shadows,
 * Draco/KTX2/Meshopt loader wiring for drei useGLTF.
 */
export function RendererSetup() {
  const { gl, scene } = useThree();

  useEffect(() => {
    applyKtx2ToDrei(gl);

    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.08;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.setClearColor(0x000000, 1);

    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) {
            if ('envMapIntensity' in m) (m as THREE.MeshStandardMaterial).envMapIntensity = 1;
          }
        }
      }
    });
  }, [gl, scene]);

  return null;
}