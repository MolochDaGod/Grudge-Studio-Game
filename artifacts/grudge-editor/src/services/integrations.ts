/**
 * Integration services — the three connectors you'll fill in as the real
 * backends land.
 *
 *   storage   object-storage facade (Cloudflare R2 / S3 / local dev).
 *             PUT  /storage/:bucket/*path   upload bytes
 *             GET  /storage/:bucket/*path   download bytes
 *             GET  /storage/:bucket         list keys
 *             DEL  /storage/:bucket/*path   delete
 *
 *   puter     puter.com user cloud sync. Pulls/pushes a user's assets
 *             between the editor's object storage and their puter disk.
 *             POST /puter/sync/:userId       pull -> local
 *             POST /puter/publish/:userId    local -> push
 *
 *   games     game-registry. Lists known Grudge games that consume these
 *             assets, and lets the editor broadcast "asset updated" events.
 *             GET  /games                    list games
 *             POST /games/:id/notify         poke a game to refresh its
 *                                            asset cache (webhook-style)
 *
 * Each starts as a placeholder adapter pattern so swapping R2 for S3 or
 * puter for localFS is a single adapter file change, not a service rewrite.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { EditorService } from './registry.ts';

// ── Adapter interfaces (swap-in-able backends) ──────────────────────────────

export interface StorageAdapter {
  put(bucket: string, key: string, bytes: Uint8Array, contentType?: string): Promise<void>;
  get(bucket: string, key: string): Promise<Uint8Array | null>;
  del(bucket: string, key: string): Promise<void>;
  list(bucket: string, prefix?: string): Promise<string[]>;
}

export interface PuterAdapter {
  /** Mirror the user's puter disk into a local bucket. */
  syncDown(userId: string): Promise<{ synced: number }>;
  /** Push a local bucket into the user's puter disk. */
  publishUp(userId: string): Promise<{ published: number }>;
}

export interface GameRegistry {
  list(): Promise<Array<{ id: string; name: string; baseUrl: string; webhook?: string }>>;
  notify(id: string, event: Record<string, unknown>): Promise<void>;
}

// ── In-memory default adapters (good enough for local dev / tests) ──────────
// Replace with real R2 / S3 / puter-sdk / HTTP webhook implementations later.

class MemoryStorage implements StorageAdapter {
  private data = new Map<string, Uint8Array>();
  private k(b: string, k: string) { return `${b}/${k}`; }
  async put(b: string, k: string, v: Uint8Array) { this.data.set(this.k(b, k), v); }
  async get(b: string, k: string) { return this.data.get(this.k(b, k)) ?? null; }
  async del(b: string, k: string) { this.data.delete(this.k(b, k)); }
  async list(b: string, prefix = '') {
    const p = `${b}/${prefix}`;
    return [...this.data.keys()].filter(k => k.startsWith(p)).map(k => k.slice(b.length + 1));
  }
}

class StubPuter implements PuterAdapter {
  async syncDown()    { return { synced: 0 };    }
  async publishUp()   { return { published: 0 }; }
}

class StubGameRegistry implements GameRegistry {
  private games = [
    { id: 'grudge-studio-game', name: 'Realm of Grudges', baseUrl: 'http://localhost:5173' },
  ];
  async list()    { return this.games; }
  async notify()  { /* TODO: webhook POST */ }
}

// ── Service factories — consume adapters, expose HTTP routes ────────────────

export function makeStorageService(adapter: StorageAdapter = new MemoryStorage()): EditorService {
  return {
    id:          'storage',
    description: 'Object-storage facade (pluggable adapter: R2, S3, local). Currently: memory stub.',
    basePath:    '/storage',
    version:     '0.1.0',

    register(app: Hono) {
      const r = new Hono();

      r.put('/:bucket/*', async (c) => {
        const bucket = c.req.param('bucket');
        const key = c.req.path.replace(`/storage/${bucket}/`, '');
        const bytes = new Uint8Array(await c.req.arrayBuffer());
        await adapter.put(bucket, key, bytes, c.req.header('content-type'));
        return c.json({ ok: true, bucket, key, size: bytes.byteLength });
      });

      r.get('/:bucket', async (c) => {
        const prefix = c.req.query('prefix') ?? '';
        const keys = await adapter.list(c.req.param('bucket'), prefix);
        return c.json({ bucket: c.req.param('bucket'), keys });
      });

      r.get('/:bucket/*', async (c) => {
        const bucket = c.req.param('bucket');
        const key = c.req.path.replace(`/storage/${bucket}/`, '');
        const bytes = await adapter.get(bucket, key);
        if (!bytes) return c.json({ error: 'not found' }, 404);
        return c.body(bytes as unknown as ArrayBuffer);
      });

      r.delete('/:bucket/*', async (c) => {
        const bucket = c.req.param('bucket');
        const key = c.req.path.replace(`/storage/${bucket}/`, '');
        await adapter.del(bucket, key);
        return c.json({ ok: true });
      });

      app.route('/storage', r);
    },
  };
}

export function makePuterService(adapter: PuterAdapter = new StubPuter()): EditorService {
  const paramSchema = z.object({ userId: z.string().min(1) });
  return {
    id:          'puter',
    description: 'Puter cloud sync (bidirectional). Pluggable adapter.',
    basePath:    '/puter',
    version:     '0.1.0',
    register(app: Hono) {
      const r = new Hono();
      r.post('/sync/:userId', async (c) => {
        const { userId } = paramSchema.parse({ userId: c.req.param('userId') });
        return c.json(await adapter.syncDown(userId));
      });
      r.post('/publish/:userId', async (c) => {
        const { userId } = paramSchema.parse({ userId: c.req.param('userId') });
        return c.json(await adapter.publishUp(userId));
      });
      app.route('/puter', r);
    },
  };
}

export function makeGamesService(registry: GameRegistry = new StubGameRegistry()): EditorService {
  return {
    id:          'games',
    description: 'Registry of Grudge games that consume editor assets.',
    basePath:    '/games',
    version:     '0.1.0',
    register(app: Hono) {
      const r = new Hono();
      r.get('/',           async (c) => c.json(await registry.list()));
      r.post('/:id/notify', async (c) => {
        const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
        await registry.notify(c.req.param('id'), body);
        return c.json({ ok: true });
      });
      app.route('/games', r);
    },
  };
}
