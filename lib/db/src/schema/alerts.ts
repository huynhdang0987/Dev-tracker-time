import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { developersTable } from "./developers";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  developerId: integer("developer_id").notNull().references(() => developersTable.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  emailSent: boolean("email_sent").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
