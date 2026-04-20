/**
 * Optimize service.
 *
 *   POST /optimize/glb   body: GLB bytes    -> smaller GLB
 *
 * Pipeline (@gltf-transform/functions):
 *   1. prune()            remove unused nodes / materials / textures
 *   2. dedup()            merge identical meshes / textures / accessors
 *   3. weld()             weld vertices to shrink index buffers
 *   4. quantize()         8/16-bit vertex quantisation
 *   5. meshopt()          apply EXT_meshopt_compression
 *
 * Typical savings: 40-70% on a hero GLB with embedded textures.
 */
import { Hono } from 'hono';
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import type { EditorService } from './registry.ts';

export const optimizeService: EditorService = {
  id:          'optimize',
  description: 'Shrink GLBs via glTF-Transform (prune, dedup, weld, quantize, meshopt).',
  basePath:    '/optimize',
  version:     '1.0.0',

  register(app: Hono) {
    const r = new Hono();
    r.post('/glb', async (c) => {
      try {
        await MeshoptEncoder.ready;
        const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
        const doc = await io.readBinary(new Uint8Array(await c.req.arrayBuffer()));
        await doc.transform(
          prune(),
          dedup(),
          weld(),
          quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
          meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
        );
        const out = await io.writeBinary(doc);
        c.header('Content-Type', 'model/gltf-binary');
        return c.body(out);
      } catch (e) {
        return c.json({ error: String((e as Error)?.message ?? e) }, 500);
      }
    });
    app.route('/optimize', r);
  },
};
