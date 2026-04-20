/**
 * Convert service.
 *
 *   POST /convert/fbx   body: FBX bytes    -> GLB bytes
 *   POST /convert/zip   body: ZIP bytes    -> ZIP of GLBs (bulk convert + re-zip)
 *
 * Both preserve rigs (skinned meshes + bones), animation clips, and embedded
 * textures. The resulting GLB is the "right file format" for any three.js /
 * R3F game client.
 */
import { Hono } from 'hono';
import { unzipSync, zipSync } from 'fflate';
import type { EditorService } from './registry.ts';
import { FbxWorkerPool } from '../workers/fbx-pool.ts';

let pool: FbxWorkerPool | null = null;

export const convertService: EditorService = {
  id:          'convert',
  description: 'FBX -> GLB + bulk-zip conversion (worker-pool; preserves rigs, animations, textures).',
  basePath:    '/convert',
  version:     '1.0.0',

  start() {
    pool = new FbxWorkerPool();
  },

  async stop() {
    await pool?.terminate();
    pool = null;
  },

  register(app: Hono) {
    const r = new Hono();

    // POST /convert/fbx -> returns GLB
    r.post('/fbx', async (c) => {
      if (!pool) return c.json({ error: 'worker pool not started' }, 503);
      const buf = await c.req.arrayBuffer();
      const cm  = c.req.query('cm-to-m') === '1';
      try {
        const { glbBytes, elapsedMs } = await pool.convert({
          fbxBytes: buf,
          convertCmToMeters: cm,
        });
        c.header('Content-Type', 'model/gltf-binary');
        c.header('X-Convert-Elapsed-Ms', elapsedMs.toFixed(1));
        return c.body(glbBytes);
      } catch (e) {
        return c.json({ error: String((e as Error)?.message ?? e) }, 500);
      }
    });

    // POST /convert/zip -> extracts, converts every FBX, returns re-zipped GLBs
    r.post('/zip', async (c) => {
      if (!pool) return c.json({ error: 'worker pool not started' }, 503);
      const buf = new Uint8Array(await c.req.arrayBuffer());
      const cm  = c.req.query('cm-to-m') === '1';
      try {
        const entries = unzipSync(buf);
        const out: Record<string, Uint8Array> = {};
        const errors: Record<string, string> = {};
        for (const [name, bytes] of Object.entries(entries)) {
          if (!/\.fbx$/i.test(name)) continue;
          try {
            const ab = bytes.buffer.slice(
              bytes.byteOffset, bytes.byteOffset + bytes.byteLength,
            ) as ArrayBuffer;
            const res = await pool.convert({ fbxBytes: ab, convertCmToMeters: cm });
            out[name.replace(/\.fbx$/i, '.glb')] = new Uint8Array(res.glbBytes);
          } catch (err) {
            errors[name] = String((err as Error)?.message ?? err);
          }
        }
        const zipped = zipSync(out, { level: 6 });
        c.header('Content-Type', 'application/zip');
        c.header('X-Convert-Errors', JSON.stringify(errors));
        return c.body(zipped as unknown as ArrayBuffer);
      } catch (e) {
        return c.json({ error: String((e as Error)?.message ?? e) }, 500);
      }
    });

    app.route('/convert', r);
  },
};
