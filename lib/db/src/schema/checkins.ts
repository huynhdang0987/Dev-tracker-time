import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { developersTable } from "./developers";

export const checkinsTable = pgTable("checkins", {
  id: serial("id").primaryKey(),
  developerId: integer("developer_id").notNull().references(() => developersTable.id),
  date: text("date").notNull(),
  checkinAt: timestamp("checkin_at", { withTimezone: true }),
  checkoutAt: timestamp("checkout_at", { withTimezone: true }),
  checkinStatus: text("checkin_status").notNull().default("missing"),
  checkoutStatus: text("checkout_status").notNull().default("missing"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCheckinSchema = createInsertSchema(checkinsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
export type Checkin = typeof checkinsTable.$inferSelect;
