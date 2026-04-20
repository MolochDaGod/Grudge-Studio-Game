/**
 * Zip / unzip helpers for the in-browser asset editor.
 *
 * Wraps `fflate` (8 KB, fast, no deps) with a friendlier API matching the
 * way the editor drops zips in — a zip arrives as an ArrayBuffer, we want
 * a `{ [path]: Uint8Array }` dict out.
 *
 * Convenience helpers for the common editor workflows:
 *   - `unzipToMap(bytes)`        — extract entire zip into memory
 *   - `zipFromMap(entries)`      — build a zip Blob from a dict
 *   - `bulkFbxToGlb(zipBytes)`   — upload.zip of FBX → { glbPath: Blob }
 *                                  (pairs with fbx2glb.fbxBytesToGlbBlob)
 *
 * All functions are Promise-based so you can await them from React handlers.
 */

import { unzipSync, zipSync } from 'fflate';
import { fbxBytesToGlbBlob, type FbxToGlbOptions } from './fbx2glb';

/** Extracted zip entry: file path (relative to archive root) -> raw bytes. */
export type ZipEntries = Record<string, Uint8Array>;

/**
 * Synchronous unzip (fflate keeps the whole archive in memory). For multi-
 * hundred-MB archives we'd want streaming via `unzip` instead, but 99% of
 * asset packs fit comfortably in memory.
 */
export function unzipToMap(bytes: ArrayBuffer | Uint8Array): ZipEntries {
  const input = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  // fflate returns directories as empty entries with trailing `/`; filter
  // them out so callers only see actual files.
  const raw = unzipSync(input);
  const out: ZipEntries = {};
  for (const [path, content] of Object.entries(raw)) {
    if (path.endsWith('/')) continue;
    out[path] = content;
  }
  return out;
}

/**
 * Pack a `{ path: Uint8Array }` map back into a zip Blob suitable for
 * download or re-upload.
 */
export function zipFromMap(entries: ZipEntries, mime = 'application/zip'): Blob {
  const packed = zipSync(entries, { level: 6 });
  return new Blob([packed as BlobPart], { type: mime });
}

/**
 * Convenience: list entries matching a predicate.
 */
export function filterEntries(
  entries: ZipEntries,
  predicate: (path: string) => boolean,
): ZipEntries {
  const out: ZipEntries = {};
  for (const [path, content] of Object.entries(entries)) {
    if (predicate(path)) out[path] = content;
  }
  return out;
}

/** Case-insensitive extension test. */
export const hasExt = (ext: string) => (path: string) =>
  path.toLowerCase().endsWith(`.${ext.toLowerCase()}`);

// ── Bulk FBX → GLB converter ────────────────────────────────────────────────
/**
 * Given a zip archive of FBX files, parse each one and emit a parallel map of
 * GLB Blobs. Uses fbxBytesToGlbBlob under the hood. Non-FBX entries are
 * ignored; failures on individual files are collected in `errors` rather than
 * rejecting the whole batch so one bad FBX doesn't block the rest.
 *
 * Returns:
 *   glbs: Record<glbPath, Blob>        — converted files, keyed by .glb path
 *   errors: Record<fbxPath, string>    — paths that failed + error message
 *   skipped: string[]                  — non-FBX paths that were ignored
 */
export interface BulkConvertResult {
  glbs: Record<string, Blob>;
  errors: Record<string, string>;
  skipped: string[];
}

export async function bulkFbxToGlb(
  zipBytes: ArrayBuffer | Uint8Array,
  opts: FbxToGlbOptions = {},
): Promise<BulkConvertResult> {
  const entries = unzipToMap(zipBytes);
  const glbs: Record<string, Blob> = {};
  const errors: Record<string, string> = {};
  const skipped: string[] = [];

  for (const [path, bytes] of Object.entries(entries)) {
    if (!hasExt('fbx')(path)) { skipped.push(path); continue; }
    try {
      const glb = await fbxBytesToGlbBlob(bytes.buffer.slice(
        bytes.byteOffset, bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer, opts);
      const glbPath = path.replace(/\.fbx$/i, '.glb');
      glbs[glbPath] = glb;
    } catch (e) {
      errors[path] = String((e as Error)?.message ?? e);
    }
  }

  return { glbs, errors, skipped };
}

/**
 * Build a single downloadable zip from a bulk conversion result — useful as
 * the "Export converted" button in the editor.
 */
export async function blobMapToZipBlob(
  blobs: Record<string, Blob>,
): Promise<Blob> {
  const entries: ZipEntries = {};
  await Promise.all(Object.entries(blobs).map(async ([path, blob]) => {
    entries[path] = new Uint8Array(await blob.arrayBuffer());
  }));
  return zipFromMap(entries);
}
