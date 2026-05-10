import { pgTable, uuid, varchar, boolean, integer, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountsTable = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  grudgeId: varchar("grudge_id", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 50 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  walletAddress: varchar("wallet_address", { length: 255 }),
  puterUuid: varchar("puter_uuid", { length: 255 }).unique(),
  isPremium: boolean("is_premium").notNull().default(false),
  gold: integer("gold").notNull().default(0),
  gbuxBalance: integer("gbux_balance").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
