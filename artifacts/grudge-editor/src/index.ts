/**
 * Grudge Editor — central asset + service hub.
 *
 * Starts a Hono HTTP server on GRUDGE_EDITOR_PORT (default 7777) that hosts a
 * registry of pluggable services. The bundled services at boot are:
 *
 *   /convert    FBX -> GLB (single + zip bulk), worker-thread pool, rig + anim preserved
 *   /optimize   GLB shrink pipeline (glTF-Transform + meshoptimizer)
 *   /fx         3D VFX library (serves ObjectStore/3dfx GLSL pairs + manifest)
 *   /storage    object-storage facade (R2/S3/memory adapter)
 *   /puter      puter.com user cloud sync
 *   /games      registry of Grudge games that consume these assets
 *
 * Adding a new service is a 3-step pattern:
 *   1. implement EditorService in src/services/<name>.ts
 *   2. import it here
 *   3. registry.register(myService);
 *
 * GET /health       -> liveness JSON
 * GET /services     -> manifest of all registered services (for editor UIs)
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

import { ServiceRegistry } from './services/registry.ts';
import { convertService } from './services/convert.ts';
import { optimizeService } from './services/optimize.ts';
import { fxService } from './services/fx.ts';
import {
  makeStorageService,
  makePuterService,
  makeGamesService,
} from './services/integrations.ts';

const PORT = Number(process.env.GRUDGE_EDITOR_PORT ?? 7777);

const app = new Hono();
app.use('*', logger());
app.use('*', cors({
  origin: (o) => o,           // reflect caller (locked down by firewall upstream)
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'X-Grudge-User'],
  exposeHeaders: ['X-Convert-Elapsed-Ms', 'X-Convert-Errors'],
}));

const registry = new ServiceRegistry();
registry.register(convertService);
registry.register(optimizeService);
registry.register(fxService);
registry.register(makeStorageService());   // swap arg for R2/S3 adapter later
registry.register(makePuterService());     // swap arg for real puter-sdk adapter
registry.register(makeGamesService());     // swap arg for persistent registry

// System endpoints
app.get('/health',   (c) => c.json({ ok: true, pid: process.pid, uptime: process.uptime() }));
app.get('/services', (c) => c.json(registry.manifest()));

await registry.startAll(app);

// Shutdown hooks — give every service a chance to release resources.
const shutdown = async () => {
  await registry.stopAll();
  process.exit(0);
};
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

serve({ fetch: app.fetch, port: PORT }, ({ port }) => {
  console.log(`[grudge-editor] listening on http://localhost:${port}`);
  console.log(`[grudge-editor] services:`);
  for (const s of registry.list()) {
    console.log(`  ${s.basePath.padEnd(12)} ${s.id.padEnd(10)} v${s.version}  ${s.description}`);
  }
});
