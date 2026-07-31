import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("general"), // general | emergency | announcement | camp
  status: text("status").notNull().default("draft"), // draft | pending_review | published | archived | rejected
  // Set when a hospital/blood bank authored this notification (e.g. a blood
  // donation camp). Null for admin-authored notifications.
  hospitalId: integer("hospital_id"),
  // Only meaningful when type = "camp".
  campDate: timestamp("camp_date", { withTimezone: true }),
  campLocation: text("camp_location"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  status: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
