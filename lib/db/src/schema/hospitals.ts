import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hospitalsTable = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  registrationNumber: text("registration_number"),
  licenseNumber: text("license_number"),
  type: text("type").notNull().default("Hospital"), // Hospital | Blood Bank
  ownership: text("ownership").notNull().default("Private"), // Government | Private
  city: text("city").notNull(),
  district: text("district").notNull(),
  state: text("state").notNull().default("Punjab"),
  address: text("address").notNull(),
  pinCode: text("pin_code"),
  contactPerson: text("contact_person"),
  contactNumber: text("contact_number").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  website: text("website"),
  googleMapsLat: numeric("google_maps_lat"),
  googleMapsLng: numeric("google_maps_lng"),
  workingHours: text("working_hours"),
  logoUrl: text("logo_url"),
  // approval_status: pending | approved | rejected | suspended
  approvalStatus: text("approval_status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  // active status
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHospitalSchema = createInsertSchema(hospitalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});
export type InsertHospital = z.infer<typeof insertHospitalSchema>;
export type Hospital = typeof hospitalsTable.$inferSelect;
