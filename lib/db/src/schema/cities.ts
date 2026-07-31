import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const districtsTable = pgTable("districts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  state: text("state").notNull().default("Punjab"),
});

export const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  district: text("district").notNull(),
  state: text("state").notNull().default("Punjab"),
});

export const insertDistrictSchema = createInsertSchema(districtsTable).omit({ id: true });
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;
export type District = typeof districtsTable.$inferSelect;

export const insertCitySchema = createInsertSchema(citiesTable).omit({ id: true });
export type InsertCity = z.infer<typeof insertCitySchema>;
export type City = typeof citiesTable.$inferSelect;
