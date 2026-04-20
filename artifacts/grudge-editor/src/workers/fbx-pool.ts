/**
 * Worker-thread pool for FBX -> GLB conversion.
 *
 * Keeps N workers alive, round-robins requests across them so a single 100MB
 * FBX doesn't queue up every other upload. Each request gets a unique id so
 * we can multiplex parallel conversions on the same worker.
 */
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export interface ConvertRequest {
  fbxBytes: ArrayBuffer;
  convertCmToMeters?: boolean;
}

export interface ConvertResult {
  glbBytes: ArrayBuffer;
  elapsedMs: number;
}

type InMsg  = { id: string; fbxBytes: ArrayBuffer; convertCmToMeters?: boolean };
type OutMsg =
  | { id: string; ok: true;  glbBytes: ArrayBuffer }
  | { id: string; ok: false; error: string };

export class FbxWorkerPool {
  private workers: Worker[] = [];
  private next = 0;
  private pending = new Map<string, (r: OutMsg) => void>();

  constructor(size: number = Math.max(1, (process.env.FBX_WORKERS ? +process.env.FBX_WORKERS : 2))) {
    // Worker script — compiled TS is placed at dist/workers/fbx-worker.js in
    // production; in dev we resolve the TS file directly via tsx.
    const workerPath = path.resolve(__dirname, 'fbx-worker.ts');
    for (let i = 0; i < size; i++) {
      const w = new Worker(workerPath, { execArgv: ['--import', 'tsx'] });
      w.on('message', (msg: OutMsg) => {
        const cb = this.pending.get(msg.id);
        if (cb) { this.pending.delete(msg.id); cb(msg); }
      });
      w.on('error', (err) => console.error('[fbx-worker error]', err));
      this.workers.push(w);
    }
  }

  convert(req: ConvertRequest): Promise<ConvertResult> {
    const id = randomUUID();
    const worker = this.workers[this.next]!;
    this.next = (this.next + 1) % this.workers.length;
    const t0 = performance.now();
    return new Promise<ConvertResult>((resolve, reject) => {
      this.pending.set(id, (msg) => {
        if (msg.ok) resolve({ glbBytes: msg.glbBytes, elapsedMs: performance.now() - t0 });
        else        reject(new Error(msg.error));
      });
      const payload: InMsg = { id, fbxBytes: req.fbxBytes, convertCmToMeters: req.convertCmToMeters };
      worker.postMessage(payload, [payload.fbxBytes]);
    });
  }

  async terminate(): Promise<void> {
    await Promise.all(this.workers.map(w => w.terminate()));
  }
}
