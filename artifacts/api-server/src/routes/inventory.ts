import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { inventoryItemsTable, charactersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

/** Verify the character belongs to the authenticated account. */
async function verifyCharOwner(accountId: string, charId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: charactersTable.id })
    .from(charactersTable)
    .where(and(eq(charactersTable.id, charId), eq(charactersTable.accountId, accountId)))
    .limit(1);
  return !!row;
}

// GET /inventory?char_id=
router.get("/", requireAuth, async (req, res) => {
  const charId = req.query.char_id as string | undefined;
  if (!charId) {
    res.status(400).json({ error: "char_id required" });
    return;
  }
  if (!(await verifyCharOwner(req.accountId!, charId))) {
    res.status(403).json({ error: "not your character" });
    return;
  }
  const rows = await db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.characterId, charId));
  res.json(rows);
});

// POST /inventory — add item
router.post("/", requireAuth, async (req, res) => {
  const { char_id, item_id, quantity, tier, metadata } = req.body;
  if (!char_id || !item_id) {
    res.status(400).json({ error: "char_id and item_id required" });
    return;
  }
  if (!(await verifyCharOwner(req.accountId!, char_id))) {
    res.status(403).json({ error: "not your character" });
    return;
  }
  const [item] = await db
    .insert(inventoryItemsTable)
    .values({
      characterId: char_id,
      itemId: item_id,
      quantity: quantity ?? 1,
      tier: tier ?? 1,
      grudgeUuid: `ITEM-${crypto.randomBytes(6).toString("hex")}`,
      metadata: metadata ?? {},
    })
    .returning();
  res.status(201).json(item);
});

// PATCH /inventory/:id/equip
router.patch("/:id/equip", requireAuth, async (req, res) => {
  const { slot } = req.body;
  if (!slot) {
    res.status(400).json({ error: "slot required" });
    return;
  }
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, req.params.id as string)).limit(1);
  if (!item) {
    res.status(404).json({ error: "item not found" });
    return;
  }
  if (!(await verifyCharOwner(req.accountId!, item.characterId))) {
    res.status(403).json({ error: "not your character" });
    return;
  }
  const [updated] = await db
    .update(inventoryItemsTable)
    .set({ slot })
    .where(eq(inventoryItemsTable.id, req.params.id as string))
    .returning();
  res.json(updated);
});

// PATCH /inventory/:id/unequip
router.patch("/:id/unequip", requireAuth, async (req, res) => {
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, req.params.id as string)).limit(1);
  if (!item) {
    res.status(404).json({ error: "item not found" });
    return;
  }
  if (!(await verifyCharOwner(req.accountId!, item.characterId))) {
    res.status(403).json({ error: "not your character" });
    return;
  }
  const [updated] = await db
    .update(inventoryItemsTable)
    .set({ slot: null })
    .where(eq(inventoryItemsTable.id, req.params.id as string))
    .returning();
  res.json(updated);
});

// DELETE /inventory/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, req.params.id as string)).limit(1);
  if (!item) {
    res.status(404).json({ error: "item not found" });
    return;
  }
  if (!(await verifyCharOwner(req.accountId!, item.characterId))) {
    res.status(403).json({ error: "not your character" });
    return;
  }
  await db.delete(inventoryItemsTable).where(eq(inventoryItemsTable.id, req.params.id as string));
  res.json({ ok: true });
});

export default router;
