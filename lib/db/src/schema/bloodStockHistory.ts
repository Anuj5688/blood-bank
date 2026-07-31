import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { hospitalsTable } from "./hospitals";

export const bloodStockHistoryTable = pgTable("blood_stock_history", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id")
    .notNull()
    .references(() => hospitalsTable.id, { onDelete: "cascade" }),
  bloodGroup: text("blood_group").notNull(),
  unitsBefore: integer("units_before").notNull(),
  unitsAfter: integer("units_after").notNull(),
  action: text("action").notNull().default("update"), // update | add | remove
  notes: text("notes"),
  performedBy: text("performed_by"), // hospital name or admin
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBloodStockHistorySchema = createInsertSchema(bloodStockHistoryTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBloodStockHistory = z.infer<typeof insertBloodStockHistorySchema>;
export type BloodStockHistory = typeof bloodStockHistoryTable.$inferSelect;
