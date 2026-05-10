import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { charactersTable, accountsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

// GET /economy/balance?char_id=
router.get("/balance", requireAuth, async (req, res) => {
  const charId = req.query.char_id as string | undefined;
  if (charId) {
    const [char] = await db
      .select({ gold: charactersTable.gold })
      .from(charactersTable)
      .where(and(eq(charactersTable.id, charId), eq(charactersTable.accountId, req.accountId!)))
      .limit(1);
    if (!char) {
      res.status(404).json({ error: "character not found" });
      return;
    }
    const [acct] = await db
      .select({ gold: accountsTable.gold, gbux: accountsTable.gbuxBalance })
      .from(accountsTable)
      .where(eq(accountsTable.id, req.accountId!))
      .limit(1);
    res.json({ character_gold: char.gold, account_gold: acct?.gold ?? 0, gbux: acct?.gbux ?? 0 });
    return;
  }
  // Account-level balance only
  const [acct] = await db
    .select({ gold: accountsTable.gold, gbux: accountsTable.gbuxBalance })
    .from(accountsTable)
    .where(eq(accountsTable.id, req.accountId!))
    .limit(1);
  if (!acct) {
    res.status(404).json({ error: "account not found" });
    return;
  }
  res.json({ account_gold: acct.gold, gbux: acct.gbux });
});

// POST /economy/spend — deduct gold from a character
router.post("/spend", requireAuth, async (req, res) => {
  const { char_id, amount, reason } = req.body;
  if (!char_id || !amount || amount <= 0) {
    res.status(400).json({ error: "char_id and positive amount required" });
    return;
  }
  const [char] = await db
    .select()
    .from(charactersTable)
    .where(and(eq(charactersTable.id, char_id), eq(charactersTable.accountId, req.accountId!)))
    .limit(1);
  if (!char) {
    res.status(404).json({ error: "character not found" });
    return;
  }
  if (char.gold < amount) {
    res.status(400).json({ error: "insufficient gold", current: char.gold, needed: amount });
    return;
  }
  const [updated] = await db
    .update(charactersTable)
    .set({ gold: sql`${charactersTable.gold} - ${amount}` })
    .where(eq(charactersTable.id, char_id))
    .returning();
  res.json({ ok: true, new_balance: updated.gold, reason });
});

// POST /economy/transfer — transfer gold between two characters on the same account
router.post("/transfer", requireAuth, async (req, res) => {
  const { from_char_id, to_char_id, amount } = req.body;
  if (!from_char_id || !to_char_id || !amount || amount <= 0) {
    res.status(400).json({ error: "from_char_id, to_char_id, and positive amount required" });
    return;
  }
  const [from] = await db
    .select()
    .from(charactersTable)
    .where(and(eq(charactersTable.id, from_char_id), eq(charactersTable.accountId, req.accountId!)))
    .limit(1);
  const [to] = await db
    .select()
    .from(charactersTable)
    .where(and(eq(charactersTable.id, to_char_id), eq(charactersTable.accountId, req.accountId!)))
    .limit(1);
  if (!from || !to) {
    res.status(404).json({ error: "one or both characters not found" });
    return;
  }
  if (from.gold < amount) {
    res.status(400).json({ error: "insufficient gold", current: from.gold, needed: amount });
    return;
  }
  await db.update(charactersTable).set({ gold: sql`${charactersTable.gold} - ${amount}` }).where(eq(charactersTable.id, from_char_id));
  await db.update(charactersTable).set({ gold: sql`${charactersTable.gold} + ${amount}` }).where(eq(charactersTable.id, to_char_id));
  res.json({ ok: true });
});

export default router;
