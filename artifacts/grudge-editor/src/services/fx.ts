/**
 * 3D FX service.
 *
 * Serves the shared stylized-VFX library under ObjectStore/3dfx/.
 *
 *   GET /fx/manifest.json        -> full library manifest
 *   GET /fx/:effect              -> { vert, frag, uniforms, geometry, ...}
 *                                   (combined JSON response, ready to hand
 *                                   to THREE.ShaderMaterial)
 *   GET /fx/:effect.vert         -> raw vertex GLSL
 *   GET /fx/:effect.frag         -> raw fragment GLSL
 *
 * The game client caches the manifest once at battle start, then lazily
 * fetches each effect on first use. New effects are published by editing
 * the manifest + the two GLSL files and restarting the editor.
 */
import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { EditorService } from './registry.ts';

// ObjectStore lives two levels up from artifacts/grudge-editor/src/services/
const FX_ROOT = path.resolve(
  process.env.GRUDGE_FX_ROOT ??
  path.join(process.cwd(), '..', '..', 'ObjectStore', '3dfx'),
);

interface EffectMeta {
  description: string;
  vert: string;
  frag: string;
  transparent?: boolean;
  doubleSide?: boolean;
  depthWrite?: boolean;
  blending?: string;
  uniforms: Record<string, { type: string; default: unknown; min?: number; max?: number; description?: string }>;
  geometry: Record<string, unknown>;
}

interface Manifest {
  version: string;
  description: string;
  effects: Record<string, EffectMeta>;
}

let cachedManifest: Manifest | null = null;

async function loadManifest(): Promise<Manifest> {
  if (cachedManifest) return cachedManifest;
  const raw = await readFile(path.join(FX_ROOT, 'manifest.json'), 'utf8');
  cachedManifest = JSON.parse(raw) as Manifest;
  return cachedManifest;
}

async function loadShader(relPath: string): Promise<string> {
  // Defence: keep reads within FX_ROOT.
  const abs = path.resolve(FX_ROOT, relPath);
  if (!abs.startsWith(FX_ROOT)) throw new Error('path escape');
  return readFile(abs, 'utf8');
}

export const fxService: EditorService = {
  id:          'fx',
  description: '3D VFX library: GLSL vert/frag shader pairs served from ObjectStore/3dfx.',
  basePath:    '/fx',
  version:     '1.0.0',

  register(app: Hono) {
    const r = new Hono();

    // GET /fx/manifest.json
    r.get('/manifest.json', async (c) => c.json(await loadManifest()));
    r.get('/',              async (c) => c.json(await loadManifest()));

    // GET /fx/:effect            -> combined JSON (vert + frag inlined)
    r.get('/:effect', async (c) => {
      const name = c.req.param('effect');
      try {
        const m = await loadManifest();
        const e = m.effects[name];
        if (!e) return c.json({ error: `unknown effect: ${name}` }, 404);
        const [vert, frag] = await Promise.all([
          loadShader(e.vert), loadShader(e.frag),
        ]);
        return c.json({ name, ...e, vert, frag });
      } catch (err) {
        return c.json({ error: String((err as Error)?.message ?? err) }, 500);
      }
    });

    // GET /fx/:effect.vert  (raw GLSL)
    r.get('/:effect.vert', async (c) => {
      const raw = (c.req.param('effect') ?? '') as string;
      const name = raw.replace(/\.vert$/, '');
      const m = await loadManifest();
      const e: EffectMeta | undefined = m.effects[name];
      if (!e) return c.text('not found', 404);
      c.header('Content-Type', 'text/plain; charset=utf-8');
      return c.body(await loadShader(e.vert));
    });

    // GET /fx/:effect.frag  (raw GLSL)
    r.get('/:effect.frag', async (c) => {
      const raw = (c.req.param('effect') ?? '') as string;
      const name = raw.replace(/\.frag$/, '');
      const m = await loadManifest();
      const e: EffectMeta | undefined = m.effects[name];
      if (!e) return c.text('not found', 404);
      c.header('Content-Type', 'text/plain; charset=utf-8');
      return c.body(await loadShader(e.frag));
    });

    app.route('/fx', r);
  },
};
