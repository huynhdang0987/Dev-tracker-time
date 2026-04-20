import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { developersTable } from "./developers";

export const responsesTable = pgTable("responses", {
  id: serial("id").primaryKey(),
  developerId: integer("developer_id").notNull().references(() => developersTable.id),
  messageAt: timestamp("message_at", { withTimezone: true }).notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  responseTimeMinutes: integer("response_time_minutes"),
  topic: text("topic"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertResponseSchema = createInsertSchema(responsesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Response = typeof responsesTable.$inferSelect;
