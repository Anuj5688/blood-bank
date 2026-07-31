import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { hospitalsTable } from "./hospitals";

export const bloodRequestsTable = pgTable("blood_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  hospitalId: integer("hospital_id")
    .notNull()
    .references(() => hospitalsTable.id, { onDelete: "cascade" }),
  bloodGroup: text("blood_group").notNull(),
  units: integer("units").notNull().default(1),
  // urgency: normal | urgent | critical
  urgency: text("urgency").notNull().default("normal"),
  patientName: text("patient_name").notNull(),
  contactNumber: text("contact_number").notNull(),
  notes: text("notes"),
  // status: pending | accepted | fulfilled | declined | cancelled
  status: text("status").notNull().default("pending"),
  hospitalResponse: text("hospital_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBloodRequestSchema = createInsertSchema(bloodRequestsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  hospitalResponse: true,
});
export type InsertBloodRequest = z.infer<typeof insertBloodRequestSchema>;
export type BloodRequest = typeof bloodRequestsTable.$inferSelect;
