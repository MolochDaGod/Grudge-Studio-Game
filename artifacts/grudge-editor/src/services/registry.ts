/**
 * Service registry.
 *
 * The editor's whole architecture is a registry of self-describing services.
 * Each service declares an id, a description, a set of HTTP routes it wants
 * mounted, and optional start/stop hooks. Adding a new service (e.g. a
 * per-game asset uploader, a puter-cloud sync, a LOD baker) is a single
 * `registry.register(myService)` call in src/index.ts — no wiring to touch.
 *
 * This is the piece that makes the brief "editability to add services" real.
 */
import type { Hono } from 'hono';

export interface EditorService {
  /** Stable machine id, kebab-case. */
  readonly id: string;
  /** Human-friendly one-liner for the /health and /services endpoints. */
  readonly description: string;
  /** URL prefix this service mounts under (e.g. "/convert"). */
  readonly basePath: string;
  /** Version tag — bump on breaking changes to the routes below. */
  readonly version: string;
  /** Mount HTTP routes on the given Hono app under `basePath`. */
  register(app: Hono): void | Promise<void>;
  /** Optional lifecycle hooks for long-lived resources. */
  start?(): void | Promise<void>;
  stop?():  void | Promise<void>;
}

export class ServiceRegistry {
  private services = new Map<string, EditorService>();

  register(service: EditorService): void {
    if (this.services.has(service.id)) {
      throw new Error(`Duplicate service id: ${service.id}`);
    }
    this.services.set(service.id, service);
  }

  list(): EditorService[] {
    return [...this.services.values()];
  }

  get(id: string): EditorService | undefined {
    return this.services.get(id);
  }

  async startAll(app: Hono): Promise<void> {
    for (const s of this.services.values()) {
      await s.register(app);
      if (s.start) await s.start();
    }
  }

  async stopAll(): Promise<void> {
    for (const s of this.services.values()) {
      if (s.stop) await s.stop();
    }
  }

  /** Metadata blob exposed at GET /services for editor UIs to introspect. */
  manifest() {
    return {
      services: this.list().map(s => ({
        id: s.id,
        description: s.description,
        basePath: s.basePath,
        version: s.version,
      })),
    };
  }
}
