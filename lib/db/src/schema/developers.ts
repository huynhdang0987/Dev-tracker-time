import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const developersTable = pgTable("developers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  slackId: text("slack_id"),
  checkinTime: text("checkin_time").notNull().default("09:00"),
  checkoutTime: text("checkout_time").notNull().default("18:00"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDeveloperSchema = createInsertSchema(developersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeveloper = z.infer<typeof insertDeveloperSchema>;
export type Developer = typeof developersTable.$inferSelect;
