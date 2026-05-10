import { pgTable, uuid, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";

export const charactersTable = pgTable("characters", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  classId: varchar("class_id", { length: 50 }).notNull(),
  raceId: varchar("race_id", { length: 50 }).notNull(),
  profession: varchar("profession", { length: 50 }),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  gold: integer("gold").notNull().default(0),
  skillPoints: integer("skill_points").notNull().default(0),
  attributes: jsonb("attributes").notNull().default({}),
  equipment: jsonb("equipment").notNull().default({}),
  professionProgression: jsonb("profession_progression").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCharacterSchema = createInsertSchema(charactersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof charactersTable.$inferSelect;
