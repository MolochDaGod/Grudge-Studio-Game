/**
 * In-browser FBX → GLB converter.
 *
 * Uses three-stdlib's FBXLoader to parse an FBX into a Three.js Object3D
 * hierarchy, then GLTFExporter to emit a GLB Blob. Runs entirely in the
 * browser — no server, no native binaries, no blender required.
 *
 * Typical usage (editor drop-zone handler):
 *   const fileBytes = await file.arrayBuffer();
 *   const glb = await fbxBytesToGlbBlob(fileBytes, { binary: true });
 *   saveAs(glb, file.name.replace(/\.fbx$/i, '.glb'));
 */

import * as THREE from 'three';
import { FBXLoader, GLTFExporter } from 'three-stdlib';

export interface FbxToGlbOptions {
  /** Include animation clips in the exported GLB (default: true). */
  animations?: boolean;
  /** Embed images as base64 inside the GLB buffer instead of referencing
   *  external URLs. Required for .glb output; ignored for .gltf. Default true. */
  embedImages?: boolean;
  /** Output a binary .glb (true) or a JSON .gltf (false). Default true. */
  binary?: boolean;
  /** Max texture size — textures larger than this get downscaled. Default: no limit. */
  maxTextureSize?: number;
  /** Axis + unit conversion. Most FBX from Mixamo/Reallusion/Unity are cm with
   *  Y-up; three.js expects metres with Y-up. When true we scale the root by
   *  0.01. Default: false (leave raw). */
  convertCmToMeters?: boolean;
}

/** Raw FBX loader instance. FBXLoader can be reused across calls safely. */
const fbxLoader = new FBXLoader();

/**
 * Parse FBX bytes into a Three.js Group (root node of the scene).
 * Rejects with a descriptive error if the bytes can't be parsed.
 */
export function loadFbxFromBytes(bytes: ArrayBuffer): Promise<THREE.Group> {
  return new Promise<THREE.Group>((resolve, reject) => {
    try {
      // FBXLoader.parse() is synchronous — we wrap it in a Promise for
      // ergonomics and to catch any thrown errors uniformly.
      const group = fbxLoader.parse(bytes, '');
      if (!group) throw new Error('FBXLoader.parse returned null');
      resolve(group);
    } catch (e) {
      reject(new Error(`FBX parse failed: ${String((e as Error)?.message ?? e)}`));
    }
  });
}

/**
 * Export a Three.js scene/group to a GLB Blob (binary) or glTF JSON string.
 * Returns a Blob with the correct MIME type ready for download or upload.
 */
export function exportToGlbBlob(
  root: THREE.Object3D,
  animations: THREE.AnimationClip[] = [],
  opts: Omit<FbxToGlbOptions, 'convertCmToMeters'> = {},
): Promise<Blob> {
  const { binary = true, embedImages = true, animations: includeAnims = true, maxTextureSize } = opts;
  const exporter = new GLTFExporter();

  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      root,
      (result) => {
        if (binary && result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: 'model/gltf-binary' }));
        } else {
          resolve(new Blob([JSON.stringify(result)], { type: 'model/gltf+json' }));
        }
      },
      (err: unknown) => reject(new Error(`GLTFExporter failed: ${String((err as { message?: string })?.message ?? err)}`)),
      {
        binary,
        embedImages,
        animations: includeAnims ? animations : [],
        maxTextureSize,
      } as any,
    );
  });
}

/**
 * End-to-end: FBX bytes → GLB Blob. Preserves embedded textures and
 * animation clips. Drop this on top of an `<input type="file">`,
 * `react-dropzone` drop handler, or a fetched asset URL.
 */
export async function fbxBytesToGlbBlob(
  bytes: ArrayBuffer,
  opts: FbxToGlbOptions = {},
): Promise<Blob> {
  const root = await loadFbxFromBytes(bytes);

  // FBXLoader attaches clips to group.animations; GLTFExporter reads them
  // from a separate argument, so thread them through explicitly.
  const clips = (root as unknown as { animations?: THREE.AnimationClip[] }).animations ?? [];

  if (opts.convertCmToMeters) {
    root.scale.setScalar(0.01);
    root.updateMatrixWorld(true);
  }

  return exportToGlbBlob(root, clips, opts);
}
