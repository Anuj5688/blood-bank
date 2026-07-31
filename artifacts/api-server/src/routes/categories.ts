import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import {
  AdminCreateCategoryBody,
  AdminUpdateCategoryBody,
  AdminUpdateCategoryParams,
  AdminDeleteCategoryParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

function formatCategory(c: typeof categoriesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    color: c.color,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
  };
}

// GET /categories — public, active only
router.get("/categories", async (req, res): Promise<void> => {
  const cats = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.isActive, true))
    .orderBy(asc(categoriesTable.name));

  res.json(cats.map(formatCategory));
});

// GET /admin/categories — admin, all
router.get("/admin/categories", requireAdmin, async (req, res): Promise<void> => {
  const cats = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.name));
  res.json(cats.map(formatCategory));
});

// POST /admin/categories
router.post("/admin/categories", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminCreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [cat] = await db
    .insert(categoriesTable)
    .values({
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? "#dc2626",
    })
    .returning();

  res.status(201).json(formatCategory(cat));
});

// PATCH /admin/categories/:id
router.patch("/admin/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminUpdateCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid category id" });
    return;
  }

  const parsed = AdminUpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const data = parsed.data;
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.color !== undefined) updates.color = data.color;
  if (data.isActive !== undefined) updates.isActive = data.isActive;

  const [cat] = await db
    .update(categoriesTable)
    .set(updates)
    .where(eq(categoriesTable.id, params.data.id))
    .returning();

  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  res.json(formatCategory(cat));
});

// DELETE /admin/categories/:id
router.delete("/admin/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminDeleteCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid category id" });
    return;
  }

  await db.delete(categoriesTable).where(eq(categoriesTable.id, params.data.id));
  res.status(204).end();
});

export default router;
