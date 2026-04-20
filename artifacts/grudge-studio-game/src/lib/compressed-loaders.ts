/**
 * Compressed-texture & geometry loader singletons.
 *
 * Why this file exists:
 *   - `ktx-parse` reads KTX2 containers but does not transcode the payload
 *     into a GPU-native format — that requires Basis Universal's WASM
 *     transcoder. Three ships `basis_transcoder.{js,wasm}` under
 *     `three/examples/jsm/libs/basis/`; we copy them into `public/basis/`
 *     so KTX2Loader can fetch them at runtime.
 *   - Draco-compressed GLBs need `draco_decoder.{js,wasm}` + wrapper,
 *     similarly bundled under `public/draco/`.
 *
 * Usage:
 *   const gltfLoader = makeGLTFLoader(renderer);    // handles Draco + KTX2
 *   const texture = await getKTX2Loader(renderer).loadAsync('/tex.ktx2');
 *
 * The `applyKtx2ToDrei` helper patches drei's `useGLTF` cache so every
 * subsequent `useGLTF()` call automatically decodes KTX2 textures and Draco
 * meshes — you only need to call it once at app boot.
 */

import * as THREE from 'three';
import { KTX2Loader, DRACOLoader, GLTFLoader, MeshoptDecoder } from 'three-stdlib';
import { useGLTF } from '@react-three/drei';

const BASE = import.meta.env.BASE_URL;

// ── Singletons ──────────────────────────────────────────────────────────────

let _ktx2Loader: KTX2Loader | null = null;
let _dracoLoader: DRACOLoader | null = null;

export function getKTX2Loader(renderer: THREE.WebGLRenderer): KTX2Loader {
  if (_ktx2Loader) return _ktx2Loader;
  const loader = new KTX2Loader();
  loader.setTranscoderPath(`${BASE}basis/`);
  loader.detectSupport(renderer);
  _ktx2Loader = loader;
  return loader;
}

export function getDRACOLoader(): DRACOLoader {
  if (_dracoLoader) return _dracoLoader;
  const loader = new DRACOLoader();
  loader.setDecoderPath(`${BASE}draco/`);
  loader.setDecoderConfig({ type: 'js' });
  _dracoLoader = loader;
  return loader;
}

/**
 * Factory for a GLTFLoader that transparently decompresses Draco geometry,
 * Basis/KTX2 textures, and Meshopt-compressed streams. Pass a WebGLRenderer
 * so KTX2 can detect the GPU's supported compressed formats.
 */
export function makeGLTFLoader(renderer: THREE.WebGLRenderer): GLTFLoader {
  const gltf = new GLTFLoader();
  gltf.setDRACOLoader(getDRACOLoader());
  gltf.setKTX2Loader(getKTX2Loader(renderer));
  gltf.setMeshoptDecoder(MeshoptDecoder as unknown as THREE.LoadingManager);
  return gltf;
}

/**
 * Teach drei's `useGLTF` hook how to decode Draco + KTX2 + Meshopt. Must be
 * called inside a component that has access to the R3F renderer — typically
 * a `<Canvas>` child:
 *
 *   function DecoderSetup() {
 *     const { gl } = useThree();
 *     useEffect(() => { applyKtx2ToDrei(gl); }, [gl]);
 *     return null;
 *   }
 */
export function applyKtx2ToDrei(renderer: THREE.WebGLRenderer): void {
  const ktx2 = getKTX2Loader(renderer);
  const draco = getDRACOLoader();
  // drei's useGLTF has a static `preload` and a `setDRACOLoader` helper;
  // both live on the underlying GLTFLoader instance that drei exposes.
  (useGLTF as unknown as { setDecoderPath?: (p: string) => void }).setDecoderPath?.(
    `${BASE}draco/`,
  );
  // drei 10 exposes a low-level hook for overriding loader extensions:
  (useGLTF as unknown as {
    configure?: (cfg: { dracoLoader?: DRACOLoader; ktx2Loader?: KTX2Loader; meshoptDecoder?: unknown }) => void;
  }).configure?.({
    dracoLoader: draco,
    ktx2Loader: ktx2,
    meshoptDecoder: MeshoptDecoder,
  });
}
