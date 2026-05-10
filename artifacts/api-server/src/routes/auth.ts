import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, signToken, JWT_SECRET } from "../middleware/auth";

const router: IRouter = Router();

function makeGrudgeId(): string {
  return `GRUDGE-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

// POST /auth/register
router.post("/register", async (req, res) => {
  const { username, password, wallet_address, puter_uuid } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "username and password required" });
    return;
  }
  const existing = await db.select().from(accountsTable).where(eq(accountsTable.username, username)).limit(1);
  if (existing.length) {
    res.status(409).json({ error: "username taken" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const grudgeId = makeGrudgeId();

  const [account] = await db
    .insert(accountsTable)
    .values({ grudgeId, username, passwordHash, walletAddress: wallet_address, puterUuid: puter_uuid })
    .returning();

  const token = signToken(account.id, account.grudgeId);
  res.status(201).json({ token, grudge_id: account.grudgeId, account_id: account.id });
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { username, password, puter_uuid, wallet_address } = req.body;

  // Puter UUID login (auto-find or create guest)
  if (puter_uuid) {
    const [existing] = await db.select().from(accountsTable).where(eq(accountsTable.puterUuid, puter_uuid)).limit(1);
    if (existing) {
      const token = signToken(existing.id, existing.grudgeId);
      res.json({ token, grudge_id: existing.grudgeId, account_id: existing.id });
      return;
    }
    // Auto-create guest for puter UUID
    const grudgeId = makeGrudgeId();
    const [account] = await db
      .insert(accountsTable)
      .values({ grudgeId, puterUuid: puter_uuid })
      .returning();
    const token = signToken(account.id, account.grudgeId);
    res.status(201).json({ token, grudge_id: account.grudgeId, account_id: account.id });
    return;
  }

  // Wallet login
  if (wallet_address) {
    const [existing] = await db.select().from(accountsTable).where(eq(accountsTable.walletAddress, wallet_address)).limit(1);
    if (existing) {
      const token = signToken(existing.id, existing.grudgeId);
      res.json({ token, grudge_id: existing.grudgeId, account_id: existing.id });
      return;
    }
    const grudgeId = makeGrudgeId();
    const [account] = await db
      .insert(accountsTable)
      .values({ grudgeId, walletAddress: wallet_address })
      .returning();
    const token = signToken(account.id, account.grudgeId);
    res.status(201).json({ token, grudge_id: account.grudgeId, account_id: account.id });
    return;
  }

  // Username + password login
  if (!username || !password) {
    res.status(400).json({ error: "credentials required" });
    return;
  }
  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.username, username)).limit(1);
  if (!account || !account.passwordHash) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }
  const token = signToken(account.id, account.grudgeId);
  res.json({ token, grudge_id: account.grudgeId, account_id: account.id });
});

// POST /auth/guest
router.post("/guest", async (_req, res) => {
  const grudgeId = makeGrudgeId();
  const [account] = await db
    .insert(accountsTable)
    .values({ grudgeId })
    .returning();
  const token = signToken(account.id, account.grudgeId);
  res.status(201).json({ token, grudge_id: account.grudgeId, account_id: account.id });
});

// POST /auth/verify-token
router.post("/verify-token", (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.json({ valid: false });
    return;
  }
  try {
    const jwt = require("jsonwebtoken") as typeof import("jsonwebtoken");
    const payload = (jwt as any).verify(token, JWT_SECRET);
    res.json({ valid: true, grudge_id: payload.grudgeId, account_id: payload.accountId });
  } catch {
    res.json({ valid: false });
  }
});

// GET /auth/user — return current user profile
router.get("/user", requireAuth, async (req, res) => {
  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, req.accountId!)).limit(1);
  if (!account) {
    res.status(404).json({ error: "account not found" });
    return;
  }
  res.json({
    id: account.id,
    grudge_id: account.grudgeId,
    username: account.username,
    is_premium: account.isPremium,
    gold: account.gold,
    gbux_balance: account.gbuxBalance,
    wallet_address: account.walletAddress,
    created_at: account.createdAt.toISOString(),
  });
});

export default router;
