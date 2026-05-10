import { pgTable, uuid, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { charactersTable } from "./characters";

export const inventoryItemsTable = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  characterId: uuid("character_id")
    .notNull()
    .references(() => charactersTable.id, { onDelete: "cascade" }),
  itemId: varchar("item_id", { length: 100 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  tier: integer("tier").notNull().default(1),
  grudgeUuid: varchar("grudge_uuid", { length: 100 }),
  slot: varchar("slot", { length: 50 }),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItemsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
