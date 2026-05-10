import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { charactersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

// GET /characters — list all characters for the authenticated account
router.get("/", requireAuth, async (req, res) => {
  const rows = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.accountId, req.accountId!));
  res.json(rows);
});

// GET /characters/:id
router.get("/:id", requireAuth, async (req, res) => {
  const [row] = await db
    .select()
    .from(charactersTable)
    .where(
      and(
        eq(charactersTable.id, req.params.id as string),
        eq(charactersTable.accountId, req.accountId!),
      ),
    )
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "character not found" });
    return;
  }
  res.json(row);
});

// POST /characters — create a new character
router.post("/", requireAuth, async (req, res) => {
  const { name, class_id, race_id, profession, attributes } = req.body;
  if (!name || !class_id || !race_id) {
    res.status(400).json({ error: "name, class_id, and race_id required" });
    return;
  }

  // Limit characters per account
  const existing = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.accountId, req.accountId!));
  if (existing.length >= 10) {
    res.status(400).json({ error: "max 10 characters per account" });
    return;
  }

  const [character] = await db
    .insert(charactersTable)
    .values({
      accountId: req.accountId!,
      name,
      classId: class_id,
      raceId: race_id,
      profession: profession ?? null,
      attributes: attributes ?? {},
    })
    .returning();

  res.status(201).json(character);
});

// PATCH /characters/:id — update a character
router.patch("/:id", requireAuth, async (req, res) => {
  const { name, profession, level, experience, gold, skill_points, attributes, equipment, profession_progression } =
    req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (profession !== undefined) updates.profession = profession;
  if (level !== undefined) updates.level = level;
  if (experience !== undefined) updates.experience = experience;
  if (gold !== undefined) updates.gold = gold;
  if (skill_points !== undefined) updates.skillPoints = skill_points;
  if (attributes !== undefined) updates.attributes = attributes;
  if (equipment !== undefined) updates.equipment = equipment;
  if (profession_progression !== undefined) updates.professionProgression = profession_progression;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "no fields to update" });
    return;
  }

  const [row] = await db
    .update(charactersTable)
    .set(updates)
    .where(
      and(
        eq(charactersTable.id, req.params.id as string),
        eq(charactersTable.accountId, req.accountId!),
      ),
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "character not found" });
    return;
  }
  res.json(row);
});

// PATCH /characters/:id/stats — shorthand for attribute updates
router.patch("/:id/stats", requireAuth, async (req, res) => {
  const [existing] = await db
    .select()
    .from(charactersTable)
    .where(
      and(
        eq(charactersTable.id, req.params.id as string),
        eq(charactersTable.accountId, req.accountId!),
      ),
    )
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "character not found" });
    return;
  }

  const merged = { ...(existing.attributes as Record<string, unknown>), ...req.body };
  const [row] = await db
    .update(charactersTable)
    .set({ attributes: merged })
    .where(eq(charactersTable.id, req.params.id as string))
    .returning();

  res.json(row);
});

// DELETE /characters/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const [row] = await db
    .delete(charactersTable)
    .where(
      and(
        eq(charactersTable.id, req.params.id as string),
        eq(charactersTable.accountId, req.accountId!),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "character not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
