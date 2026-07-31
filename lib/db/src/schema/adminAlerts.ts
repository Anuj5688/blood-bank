import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Internal alerts shown to super admins in the admin portal, e.g. "new hospital
// registration awaiting approval". Distinct from `notifications`, which are
// public broadcast announcements shown to end users.
export const adminAlertsTable = pgTable("admin_alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // hospital_registration | ...
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"), // e.g. "hospital"
  entityId: integer("entity_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdminAlertSchema = createInsertSchema(adminAlertsTable).omit({
  id: true,
  createdAt: true,
  isRead: true,
});
export type InsertAdminAlert = z.infer<typeof insertAdminAlertSchema>;
export type AdminAlert = typeof adminAlertsTable.$inferSelect;
