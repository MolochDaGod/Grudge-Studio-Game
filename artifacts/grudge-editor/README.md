# @workspace/grudge-editor
Central asset + service hub for Grudge Studio. Built-in services:
| Prefix | What it does |
| --- | --- |
| `/convert` | FBX → GLB (single + zip bulk), worker-pool, **rig + anim preserved** |
| `/optimize` | GLB shrink via glTF-Transform + meshoptimizer (40–70 % size win) |
| `/fx` | Serves the `ObjectStore/3dfx` VFX library (manifest + GLSL pairs) |
| `/storage` | Object-storage facade (R2 / S3 / memory adapter) |
| `/puter` | puter.com user cloud bidirectional sync |
| `/games` | Registry of Grudge games that consume these assets |
Plus system routes:
- `GET /health` — liveness
- `GET /services` — manifest of every registered service
## Run
```bash
pnpm --filter @workspace/grudge-editor install
pnpm --filter @workspace/grudge-editor dev     # tsx watch → http://localhost:7777
```
Environment:
- `GRUDGE_EDITOR_PORT` — default `7777`
- `GRUDGE_FX_ROOT` — where the `/fx` service reads shaders from (default `../../ObjectStore/3dfx`)
- `FBX_WORKERS` — worker-pool size, default `2`
## Try it
```bash
# FBX -> GLB (rig + animations preserved, emits binary .glb)
curl -X POST --data-binary @my.fbx http://localhost:7777/convert/fbx -o my.glb

# Bulk convert a zip of FBX assets
curl -X POST --data-binary @pack.zip http://localhost:7777/convert/zip -o pack.glb.zip

# Shrink a GLB
curl -X POST --data-binary @my.glb http://localhost:7777/optimize/glb -o my.opt.glb

# VFX library
curl http://localhost:7777/fx/manifest.json | jq
curl http://localhost:7777/fx/fire       # JSON with vert + frag inlined
curl http://localhost:7777/fx/fire.vert  # raw GLSL
```
## Add a new service
1. Implement the interface in `src/services/<name>.ts`:
   ```ts
   import type { EditorService } from './registry.ts';
   export const myService: EditorService = {
     id: 'my-service',
     description: 'What it does',
     basePath: '/my-service',
     version: '0.1.0',
     register(app) { /* mount Hono routes */ },
   };
   ```
2. Import + register in `src/index.ts`:
   ```ts
   import { myService } from './services/my-service.ts';
   registry.register(myService);
   ```
That's it — `/health`, `/services`, CORS, logging, shutdown hooks all apply automatically.
## Add a new 3D effect
1. Drop `{name}.vert.glsl` + `{name}.frag.glsl` into `ObjectStore/3dfx/shaders/`.
2. Append an entry to `ObjectStore/3dfx/manifest.json` declaring its uniforms + geometry.
3. Restart the editor (or just bust the manifest cache).
Every game that consumes `/fx/:name` gets the new effect next time it fetches.
## Swap out a backend adapter
Services that wrap integrations (`storage`, `puter`, `games`) take an adapter argument. To switch from the in-memory stub to Cloudflare R2:
```ts
// src/adapters/r2-storage.ts
export class R2Storage implements StorageAdapter { /* AWS SDK calls */ }
// src/index.ts
registry.register(makeStorageService(new R2Storage({ accountId, bucket, ... })));
```
No service code needs to change — only the adapter impl.
