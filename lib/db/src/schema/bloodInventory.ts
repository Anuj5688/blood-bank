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

export const bloodInventoryTable = pgTable("blood_inventory", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id")
    .notNull()
    .references(() => hospitalsTable.id, { onDelete: "cascade" }),
  bloodGroup: text("blood_group").notNull(), // A+, A-, B+, B-, AB+, AB-, O+, O-
  units: integer("units").notNull().default(0),
  // status: Available | Low Stock | Out of Stock
  status: text("status").notNull().default("Out of Stock"),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBloodInventorySchema = createInsertSchema(bloodInventoryTable).omit({
  id: true,
  lastUpdated: true,
});
export type InsertBloodInventory = z.infer<typeof insertBloodInventorySchema>;
export type BloodInventory = typeof bloodInventoryTable.$inferSelect;
