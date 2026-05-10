import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";

export const islandsTable = pgTable("islands", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  biome: varchar("biome", { length: 50 }).notNull().default("temperate"),
  resources: jsonb("resources").notNull().default({}),
  buildings: jsonb("buildings").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIslandSchema = createInsertSchema(islandsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertIsland = z.infer<typeof insertIslandSchema>;
export type Island = typeof islandsTable.$inferSelect;
