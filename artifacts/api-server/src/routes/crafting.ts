import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

/**
 * Crafting recipes are defined in ObjectStore (static JSON at
 * https://molochdagod.github.io/ObjectStore/api/v1/weapons.json etc.)
 * This route proxies / caches them so frontends can use a single API base.
 *
 * In-progress crafts are stored per-character in memory for now (MVP);
 * Phase 2 will persist them to a `crafting_queue` table.
 */

interface CraftJob {
  id: string;
  charId: string;
  recipeId: string;
  startedAt: number;
  durationMs: number;
}

const queue: Map<string, CraftJob> = new Map();
let nextId = 1;

// GET /crafting/recipes — proxy ObjectStore recipe data
router.get("/recipes", async (req, res) => {
  const classFilter = req.query.class as string | undefined;
  const profFilter = req.query.profession as string | undefined;
  try {
    // Fetch from ObjectStore — weapons as a representative recipe source
    const urls = [
      "https://molochdagod.github.io/ObjectStore/api/v1/weapons.json",
      "https://molochdagod.github.io/ObjectStore/api/v1/armor.json",
      "https://molochdagod.github.io/ObjectStore/api/v1/consumables.json",
    ];
    const results = await Promise.all(urls.map((u) => fetch(u).then((r) => r.json()).catch(() => null)));
    const [weapons, armor, consumables] = results;
    res.json({ weapons, armor, consumables });
  } catch {
    res.status(502).json({ error: "failed to fetch recipes" });
  }
});

// GET /crafting/queue — list in-progress crafts
router.get("/queue", requireAuth, (req, res) => {
  const charId = req.query.char_id as string | undefined;
  const jobs = Array.from(queue.values()).filter(
    (j) => !charId || j.charId === charId,
  );
  res.json(jobs);
});

// POST /crafting/start — begin a craft
router.post("/start", requireAuth, (req, res) => {
  const { char_id, recipe_id, duration_ms } = req.body;
  if (!char_id || !recipe_id) {
    res.status(400).json({ error: "char_id and recipe_id required" });
    return;
  }
  const id = String(nextId++);
  const job: CraftJob = {
    id,
    charId: char_id,
    recipeId: recipe_id,
    startedAt: Date.now(),
    durationMs: duration_ms ?? 5000,
  };
  queue.set(id, job);
  res.status(201).json(job);
});

// PATCH /crafting/:id/complete — finish a craft
router.patch("/:id/complete", requireAuth, (req, res) => {
  const job = queue.get(req.params.id as string);
  if (!job) {
    res.status(404).json({ error: "craft not found" });
    return;
  }
  const elapsed = Date.now() - job.startedAt;
  if (elapsed < job.durationMs) {
    res.status(400).json({ error: "craft not ready", remaining_ms: job.durationMs - elapsed });
    return;
  }
  queue.delete(req.params.id as string);
  res.json({ ok: true, recipe_id: job.recipeId });
});

// DELETE /crafting/:id — cancel a craft
router.delete("/:id", requireAuth, (req, res) => {
  if (!queue.has(req.params.id as string)) {
    res.status(404).json({ error: "craft not found" });
    return;
  }
  queue.delete(req.params.id as string);
  res.json({ ok: true });
});

export default router;
