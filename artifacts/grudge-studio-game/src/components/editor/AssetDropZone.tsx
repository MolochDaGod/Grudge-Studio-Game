/**
 * AssetDropZone — drag-and-drop asset ingestion widget for in-browser editors.
 *
 * Routes dropped files by extension:
 *   - .fbx   → fbxBytesToGlbBlob() + onConverted(glbBlob, name)
 *   - .zip   → unzipToMap(); FBX entries are bulk-converted, others handed
 *              back raw via onRawFiles({ path: bytes })
 *   - .glb / .gltf → passed straight through to onGlb(blob, name)
 *   - .png / .jpg / .webp → passed to onTexture(blob, name)
 *
 * Designed to plug into /mapadmin, the character builder, and the asset
 * gallery. Purely presentational — caller decides what to do with the
 * converted Blobs (upload, persist, register).
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { saveAs } from 'file-saver';
import {
  fbxBytesToGlbBlob,
  bulkFbxToGlb,
  unzipToMap,
  hasExt,
  type FbxToGlbOptions,
} from '@/lib/asset-pipeline';

export interface AssetDropZoneProps {
  /** Called whenever an FBX-or-converted-from-zip GLB lands. */
  onGlb?: (blob: Blob, name: string) => void;
  /** Called for raw PNG/JPG/WEBP texture drops. */
  onTexture?: (blob: Blob, name: string) => void;
  /** Called for any non-asset zip entries (JSON, txt, etc.). */
  onRawFile?: (path: string, bytes: Uint8Array) => void;
  /** Drop an already-extracted GLB/GLTF blob. */
  onGltf?: (blob: Blob, name: string) => void;
  /** Options forwarded to the FBX→GLB converter. */
  fbxToGlbOptions?: FbxToGlbOptions;
  /** If true, auto-download each converted GLB as it's produced. Default false. */
  autoDownload?: boolean;
  /** Custom label shown inside the drop area. */
  label?: string;
  className?: string;
}

type LogEntry = {
  level: 'info' | 'warn' | 'error';
  text: string;
  at: number;
};

export function AssetDropZone({
  onGlb,
  onTexture,
  onRawFile,
  onGltf,
  fbxToGlbOptions,
  autoDownload = false,
  label = 'Drop FBX, ZIP, GLB, or textures here',
  className = '',
}: AssetDropZoneProps) {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  const push = useCallback((level: LogEntry['level'], text: string) => {
    setLog(prev => [...prev.slice(-49), { level, text, at: Date.now() }]);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const name = file.name;
    const lower = name.toLowerCase();
    const bytes = await file.arrayBuffer();

    if (lower.endsWith('.fbx')) {
      push('info', `Converting ${name} → GLB…`);
      try {
        const glb = await fbxBytesToGlbBlob(bytes, fbxToGlbOptions);
        const outName = name.replace(/\.fbx$/i, '.glb');
        onGlb?.(glb, outName);
        if (autoDownload) saveAs(glb, outName);
        push('info', `✓ ${outName} (${Math.round(glb.size / 1024)} KB)`);
      } catch (e) {
        push('error', `✗ ${name}: ${String((e as Error)?.message ?? e)}`);
      }
      return;
    }

    if (lower.endsWith('.zip')) {
      push('info', `Unzipping ${name}…`);
      try {
        const entries = unzipToMap(bytes);
        const fbxCount = Object.keys(entries).filter(hasExt('fbx')).length;
        push('info', `Zip has ${Object.keys(entries).length} files (${fbxCount} FBX)`);

        if (fbxCount > 0) {
          const { glbs, errors, skipped } = await bulkFbxToGlb(bytes, fbxToGlbOptions);
          for (const [path, blob] of Object.entries(glbs)) {
            onGlb?.(blob, path);
            if (autoDownload) saveAs(blob, path.split('/').pop() ?? path);
          }
          push('info', `✓ Converted ${Object.keys(glbs).length} FBX → GLB`);
          for (const [p, err] of Object.entries(errors)) push('error', `✗ ${p}: ${err}`);
          // Hand off non-FBX entries (textures, JSON, etc.)
          for (const path of skipped) {
            const entry = entries[path];
            if (!entry) continue;
            if (/\.(png|jpe?g|webp)$/i.test(path) && onTexture) {
              onTexture(new Blob([entry as BlobPart], { type: 'image/png' }), path);
            } else {
              onRawFile?.(path, entry);
            }
          }
        } else {
          // No FBX inside — route entries by extension
          for (const [path, entry] of Object.entries(entries)) {
            if (/\.(png|jpe?g|webp)$/i.test(path) && onTexture) {
              onTexture(new Blob([entry as BlobPart], { type: 'image/png' }), path);
            } else if (/\.(gl(b|tf))$/i.test(path) && (onGltf || onGlb)) {
              const blob = new Blob([entry as BlobPart], { type: 'model/gltf-binary' });
              (onGltf ?? onGlb)?.(blob, path);
            } else {
              onRawFile?.(path, entry);
            }
          }
          push('info', `✓ Extracted ${Object.keys(entries).length} files`);
        }
      } catch (e) {
        push('error', `✗ ${name}: ${String((e as Error)?.message ?? e)}`);
      }
      return;
    }

    if (/\.(gl(b|tf))$/i.test(lower)) {
      const blob = new Blob([bytes], { type: lower.endsWith('.glb') ? 'model/gltf-binary' : 'model/gltf+json' });
      (onGltf ?? onGlb)?.(blob, name);
      push('info', `✓ ${name} (${Math.round(blob.size / 1024)} KB)`);
      return;
    }

    if (/\.(png|jpe?g|webp)$/i.test(lower)) {
      onTexture?.(new Blob([bytes], { type: `image/${lower.split('.').pop()}` }), name);
      push('info', `✓ ${name} (texture)`);
      return;
    }

    push('warn', `Ignored (unknown type): ${name}`);
  }, [onGlb, onGltf, onTexture, onRawFile, fbxToGlbOptions, autoDownload, push]);

  const onDrop = useCallback(async (accepted: File[]) => {
    setBusy(true);
    try {
      for (const f of accepted) await handleFile(f);
    } finally {
      setBusy(false);
    }
  }, [handleFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip':             ['.zip'],
      'model/gltf-binary':           ['.glb'],
      'model/gltf+json':             ['.gltf'],
      'application/octet-stream':    ['.fbx'],
      'image/png':                   ['.png'],
      'image/jpeg':                  ['.jpg', '.jpeg'],
      'image/webp':                  ['.webp'],
    },
    multiple: true,
  });

  const recent = useMemo(() => log.slice(-8).reverse(), [log]);

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-white/20 hover:border-white/40'}
          ${busy ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="text-sm text-white/80">{busy ? 'Processing…' : label}</div>
        <div className="text-xs text-white/40 mt-1">
          FBX auto-converts to GLB. ZIP is extracted (FBX inside auto-converts).
        </div>
      </div>

      {recent.length > 0 && (
        <ul className="mt-3 text-xs font-mono space-y-0.5 max-h-40 overflow-y-auto">
          {recent.map(e => (
            <li
              key={e.at + e.text}
              className={
                e.level === 'error' ? 'text-red-400' :
                e.level === 'warn'  ? 'text-yellow-300' :
                                      'text-white/60'
              }
            >
              {e.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
