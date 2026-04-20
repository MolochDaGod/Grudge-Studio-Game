/**
 * FBX → GLB conversion worker.
 *
 * Runs in a Node worker_thread so big FBX packs (100+ MB) don't block the
 * HTTP server's event loop. We polyfill the browser globals three-stdlib's
 * FBXLoader expects (self, document, window) with minimal stubs — FBXLoader
 * only uses them for type checks, never DOM manipulation.
 *
 * Message protocol:
 *   in:  { id: string; fbxBytes: ArrayBuffer; convertCmToMeters?: boolean }
 *   out (ok):  { id: string; ok: true; glbBytes: ArrayBuffer }
 *   out (err): { id: string; ok: false; error: string }
 */
import { parentPort } from 'node:worker_threads';

// ── Minimal browser-global polyfills (FBXLoader only does typeof checks) ───
// These must be set BEFORE we import three-stdlib. The FBXLoader doesn't
// actually *use* the DOM, but it references `self` and `document` at parse
// time for feature detection.
const g = globalThis as Record<string, unknown>;
if (!g.self)     g.self     = globalThis;
if (!g.window)   g.window   = globalThis;
if (!g.document) {
  g.document = {
    createElement: () => ({ getContext: () => null }),
    createElementNS: () => ({}),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

// Import loaders AFTER polyfills. We avoid a direct `import('three')` here
// because this worker runs in Node without @types/three — three-stdlib
// already bundles the bits it needs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STDLIB: any = await import('three-stdlib');
const { FBXLoader, GLTFExporter } = STDLIB;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Clip = any;

type In  = { id: string; fbxBytes: ArrayBuffer; convertCmToMeters?: boolean };
type Out =
  | { id: string; ok: true;  glbBytes: ArrayBuffer }
  | { id: string; ok: false; error: string };

parentPort!.on('message', async (msg: In) => {
  const respond = (r: Out) => parentPort!.postMessage(r);
  try {
    const loader = new FBXLoader();
    const root = loader.parse(msg.fbxBytes, '');
    if (msg.convertCmToMeters) {
      root.scale.setScalar(0.01);
      root.updateMatrixWorld(true);
    }
    const clips: Clip[] = ((root as unknown as { animations?: Clip[] }).animations) ?? [];

    const exporter = new GLTFExporter();
    const glb = await new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        root,
        (result: ArrayBuffer | object) => {
          if (result instanceof ArrayBuffer) resolve(result);
          else reject(new Error('Expected binary GLB, got JSON'));
        },
        (err: unknown) => reject(new Error(String((err as { message?: string })?.message ?? err))),
        { binary: true, embedImages: true, animations: clips } as never,
      );
    });

    respond({ id: msg.id, ok: true, glbBytes: glb });
  } catch (e) {
    respond({ id: msg.id, ok: false, error: String((e as Error)?.message ?? e) });
  }
});
